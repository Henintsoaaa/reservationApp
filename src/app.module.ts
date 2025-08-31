import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './common/database.module';
import { RedisModule } from './common/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReservationsModule } from './reservations/reservations.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { VenuesModule } from './venues/venues.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ReservationsModule,
    VenuesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
