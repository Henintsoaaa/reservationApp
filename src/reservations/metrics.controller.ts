import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReservationMetricsService } from './metrics.service';

@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // Seuls les admins peuvent voir les métriques
export class MetricsController {
  constructor(private readonly metricsService: ReservationMetricsService) {}

  @Get('cache')
  async getCacheStats() {
    return {
      success: true,
      data: await this.metricsService.getCacheStats(),
    };
  }

  @Get('performance')
  async getPerformanceMetrics(@Query('operation') operation?: string) {
    return {
      success: true,
      data: await this.metricsService.getPerformanceMetrics(operation),
    };
  }

  @Get('concurrency')
  async getConcurrencyMetrics(@Query('venueId') venueId?: string) {
    return {
      success: true,
      data: await this.metricsService.getConcurrencyMetrics(venueId),
    };
  }

  @Get('cleanup')
  async cleanupOldMetrics() {
    await this.metricsService.cleanupOldMetrics();
    return {
      success: true,
      message: 'Old metrics cleaned up successfully',
    };
  }

  @Get('summary')
  async getMetricsSummary() {
    const [cacheStats, performanceMetrics, concurrencyMetrics] =
      await Promise.all([
        this.metricsService.getCacheStats(),
        this.metricsService.getPerformanceMetrics(),
        this.metricsService.getConcurrencyMetrics(),
      ]);

    return {
      success: true,
      data: {
        cache: cacheStats,
        performance: performanceMetrics.analysis,
        concurrency: concurrencyMetrics.analysis,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
