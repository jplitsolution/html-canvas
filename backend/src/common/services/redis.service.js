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
