import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => new Redis(),
    },
  ],
  exports: ['REDIS'],
})
export class RedisModule {}
