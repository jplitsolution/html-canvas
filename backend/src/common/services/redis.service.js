import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  logger = new Logger(RedisService.name);
  client = null;

  constructor(@Inject(ConfigService) configService) {
    this.configService = configService;
  }

  onModuleInit() {
    const host = this.configService.get('redis.host') || '127.0.0.1';
    const port = this.configService.get('redis.port') || 6379;
    const password = this.configService.get('redis.password');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.error('Redis connection failed after 5 retries. Disabling Redis cache.');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => this.logger.log(`Redis connected at ${host}:${port}`));
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));

    this.client.connect().catch(() => {
      this.logger.warn('Redis connect() failed — falling back to no-cache mode.');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get(key) {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async set(key, value, ttlSeconds = 15) {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // silently fail
    }
  }

  async del(key) {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // silently fail
    }
  }

  async incr(key, ttlSeconds) {
    if (!this.client) return 0;
    try {
      const result = await this.client.incr(key);
      if (result === 1 && ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
      }
      return result;
    } catch {
      return 0;
    }
  }

  isConnected() {
    return this.client?.status === 'ready';
  }

  getClient() {
    return this.client;
  }
}
