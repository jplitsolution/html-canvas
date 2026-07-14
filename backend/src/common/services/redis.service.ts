import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host') || '127.0.0.1';
    const port = this.configService.get<number>('redis.port') || 6379;
    const password = this.configService.get<string>('redis.password');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 5) {
          this.logger.error('Redis connection failed after 5 retries. Disabling Redis cache.');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => this.logger.log(`Redis connected at ${host}:${port}`));
    this.client.on('error', (err: Error) => this.logger.warn(`Redis error: ${err.message}`));

    this.client.connect().catch(() => {
      this.logger.warn('Redis connect() failed — falling back to no-cache mode.');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Get a cached value. Returns null if key not found or Redis is unavailable.
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set a value in Redis with optional TTL in seconds.
   */
  async set(key: string, value: any, ttlSeconds = 15): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // silently fail — cache miss is always safe
    }
  }

  /**
   * Delete a key from Redis.
   */
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // silently fail
    }
  }

  /**
   * Returns true if Redis connection is alive.
   */
  isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  /**
   * Get raw ioredis client.
   */
  getClient(): Redis | null {
    return this.client;
  }
}
