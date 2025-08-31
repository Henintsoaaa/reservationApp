import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ttl: 600, // 10 minutes default TTL
    }),
  ],
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => new Redis(),
    },
  ],
  exports: ['REDIS', CacheModule],
})
export class RedisModule {}
