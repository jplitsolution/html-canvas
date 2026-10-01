import Redis from 'ioredis';
import getConfig from '../../config/configuration.js';

let redisClient = null;

export const createRedisService = () => {
  const config = getConfig();
  const host = config.redis?.host || '127.0.0.1';
  const port = config.redis?.port || 6379;
  const password = config.redis?.password;

  if (!redisClient) {
    redisClient = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          console.error(
            'Redis connection failed after 5 retries. Disabling Redis cache.',
          );
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () =>
      console.log(`Redis connected at ${host}:${port}`),
    );
    redisClient.on('error', (err) =>
      console.warn(`Redis error: ${err.message}`),
    );

    redisClient.connect().catch(() => {
      console.warn('Redis connect() failed — falling back to no-cache mode.');
    });
  }

  return {
    get: async (key) => {
      if (!redisClient) return null;
      try {
        const raw = await redisClient.get(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    set: async (key, value, ttlSeconds = 15) => {
      if (!redisClient) return;
      try {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch {
        // silently fail
      }
    },
    /** SET key NX EX — returns true if lock acquired. */
    setNx: async (key, value, ttlSeconds = 10) => {
      if (!redisClient) return true;
      try {
        const result = await redisClient.set(
          key,
          JSON.stringify(value ?? '1'),
          'EX',
          ttlSeconds,
          'NX',
        );
        return result === 'OK';
      } catch {
        return true;
      }
    },
    del: async (key) => {
      if (!redisClient) return;
      try {
        await redisClient.del(key);
      } catch {
        // silently fail
      }
    },
    incr: async (key, ttlSeconds) => {
      if (!redisClient) return 0;
      try {
        const result = await redisClient.incr(key);
        if (result === 1 && ttlSeconds) {
          await redisClient.expire(key, ttlSeconds);
        }
        return result;
      } catch {
        return 0;
      }
    },
    flushDb: async () => {
      if (!redisClient || redisClient.status !== 'ready') {
        throw new Error('Redis is not connected');
      }
      await redisClient.flushdb();
      return { success: true };
    },
    deletePattern: async (pattern = '*') => {
      if (!redisClient || redisClient.status !== 'ready') {
        throw new Error('Redis is not connected');
      }
      if (!pattern || typeof pattern !== 'string') {
        throw new Error('Invalid key pattern');
      }
      return new Promise((resolve, reject) => {
        const stream = redisClient.scanStream({
          match: pattern,
          count: 100,
        });
        let deletedCount = 0;
        stream.on('data', async (keys = []) => {
          if (keys.length > 0) {
            stream.pause();
            try {
              const pipeline = redisClient.pipeline();
              keys.forEach((k) => pipeline.del(k));
              await pipeline.exec();
              deletedCount += keys.length;
              stream.resume();
            } catch (err) {
              stream.destroy(err);
            }
          }
        });
        stream.on('end', () => resolve({ deletedCount, pattern }));
        stream.on('error', (err) => reject(err));
      });
    },
    deleteKey: async (key) => {
      if (!redisClient || redisClient.status !== 'ready') {
        throw new Error('Redis is not connected');
      }
      const result = await redisClient.del(key);
      return { deleted: result > 0, key };
    },
    scanKeys: async ({ pattern = '*', limit = 50 } = {}) => {
      if (!redisClient || redisClient.status !== 'ready') {
        return { keys: [], count: 0 };
      }
      return new Promise((resolve, reject) => {
        const stream = redisClient.scanStream({
          match: pattern,
          count: 100,
        });
        const foundKeys = [];
        let destroyed = false;
        const resolveKeys = async () => {
          try {
            if (foundKeys.length === 0) {
              return resolve({ keys: [], count: 0 });
            }
            const pipeline = redisClient.pipeline();
            foundKeys.forEach((k) => {
              pipeline.ttl(k);
              pipeline.type(k);
            });
            const results = await pipeline.exec();
            const enriched = foundKeys.map((key, i) => {
              const ttl = results[i * 2]?.[1] ?? -1;
              const type = results[i * 2 + 1]?.[1] ?? 'unknown';
              return { key, ttl, type };
            });
            resolve({ keys: enriched, count: enriched.length });
          } catch {
            resolve({
              keys: foundKeys.map((k) => ({ key: k, ttl: -1, type: 'string' })),
              count: foundKeys.length,
            });
          }
        };

        stream.on('data', (keys = []) => {
          for (const k of keys) {
            if (foundKeys.length < limit) {
              foundKeys.push(k);
            }
          }
          if (foundKeys.length >= limit && !destroyed) {
            destroyed = true;
            stream.destroy();
            resolveKeys();
          }
        });
        stream.on('end', () => {
          if (!destroyed) resolveKeys();
        });
        stream.on('error', (err) => reject(err));
      });
    },
    getStats: async () => {
      const isReady = redisClient && redisClient.status === 'ready';
      if (!isReady) {
        return {
          connected: false,
          status: redisClient?.status || 'disconnected',
          host,
          port,
          totalKeys: 0,
          memoryHuman: 'N/A',
          redisVersion: 'N/A',
          uptimeDays: 'N/A',
          groups: {
            flow: 0,
            campaign: 0,
            detection: 0,
            otp: 0,
            other: 0,
          },
        };
      }

      try {
        const dbsize = await redisClient.dbsize();
        let memoryHuman = 'N/A';
        let redisVersion = 'N/A';
        let uptimeDays = 'N/A';

        try {
          const infoRaw = await redisClient.info();
          const getField = (field) => {
            const match = infoRaw.match(new RegExp(`^${field}:(.+)$`, 'm'));
            return match ? match[1].trim() : null;
          };
          memoryHuman = getField('used_memory_human') || 'N/A';
          redisVersion = getField('redis_version') || 'N/A';
          const uptimeSec = parseInt(getField('uptime_in_seconds') || '0', 10);
          if (uptimeSec > 0) {
            uptimeDays = (uptimeSec / 86400).toFixed(1);
          }
        } catch {
          // info command might be blocked or restricted
        }

        const groups = await new Promise((resolve) => {
          const g = { flow: 0, campaign: 0, detection: 0, otp: 0, other: 0 };
          let count = 0;
          let destroyed = false;
          const s = redisClient.scanStream({ match: '*', count: 100 });
          s.on('data', (keys = []) => {
            count += keys.length;
            for (const k of keys) {
              if (k.startsWith('flow:')) g.flow++;
              else if (k.startsWith('campaign:')) g.campaign++;
              else if (
                k.startsWith('orange_bf:') ||
                k.startsWith('universe_dcb:')
              )
                g.detection++;
              else if (k.startsWith('otp:')) g.otp++;
              else g.other++;
            }
            if (count >= 1000 && !destroyed) {
              destroyed = true;
              s.destroy();
              resolve(g);
            }
          });
          s.on('end', () => {
            if (!destroyed) resolve(g);
          });
          s.on('error', () => resolve(g));
        });

        return {
          connected: true,
          status: 'ready',
          host,
          port,
          totalKeys: dbsize,
          memoryHuman,
          redisVersion,
          uptimeDays,
          groups,
        };
      } catch (err) {
        return {
          connected: true,
          status: redisClient.status,
          host,
          port,
          error: err.message,
          totalKeys: 0,
          memoryHuman: 'N/A',
          redisVersion: 'N/A',
          uptimeDays: 'N/A',
          groups: { flow: 0, campaign: 0, detection: 0, otp: 0, other: 0 },
        };
      }
    },
    isConnected: () => redisClient?.status === 'ready',
    getClient: () => redisClient,
    disconnect: async () => {
      if (redisClient) {
        await redisClient.quit();
        redisClient = null;
      }
    },
  };
};

export const redisService = createRedisService();
