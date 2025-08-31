import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationMetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [ReservationsController, MetricsController],
  providers: [ReservationsService, ReservationMetricsService],
  exports: [ReservationsService, ReservationMetricsService],
})
export class ReservationsModule {}
