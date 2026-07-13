import { Global, Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';

/**
 * Global Redis module — inject RedisService anywhere without re-importing.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
