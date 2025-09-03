import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './common/database.module';
import { RedisModule } from './common/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { EventsModule } from './events/events.module';
import { ReviewsModule } from './reviews/reviews.module';
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    BookingsModule,
    CacheModule.register({
      isGlobal: true,
    }),
    EventsModule,
    ReviewsModule,
    BookingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
