import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ReservationMetricsService {
  constructor(
    @Inject('REDIS') private redis: any,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async recordPerformanceMetric(
    operation: string,
    duration: number,
    success: boolean,
  ): Promise<void> {
    const timestamp = Date.now();
    const metric = {
      operation,
      duration,
      success,
      timestamp,
    };

    const key = `metrics:${operation}:${timestamp}`;
    await this.redis.setex(key, 86400, JSON.stringify(metric));

    await this.redis.incr(`counter:${operation}:total`);
    if (success) {
      await this.redis.incr(`counter:${operation}:success`);
    } else {
      await this.redis.incr(`counter:${operation}:failure`);
    }

    await this.redis.expire(`counter:${operation}:total`, 604800);
    await this.redis.expire(`counter:${operation}:success`, 604800);
    await this.redis.expire(`counter:${operation}:failure`, 604800);
  }

  async recordConcurrencyEvent(
    venueId: string,
    eventType: 'lock_acquired' | 'lock_failed' | 'conflict_detected',
  ): Promise<void> {
    const timestamp = Date.now();
    const event = {
      venueId,
      eventType,
      timestamp,
    };

    const key = `concurrency:${venueId}:${timestamp}`;
    await this.redis.setex(key, 86400, JSON.stringify(event));

    await this.redis.incr(`concurrency_counter:${venueId}:${eventType}`);
    await this.redis.expire(
      `concurrency_counter:${venueId}:${eventType}`,
      86400,
    );
  }

  async getCacheStats(): Promise<any> {
    try {
      const stats = {
        hits: (await this.redis.get('cache_stats:hits')) || 0,
        misses: (await this.redis.get('cache_stats:misses')) || 0,
        keys: await this.redis.dbsize(),
        memory: await this.redis.memory('usage'),
      };

      return {
        ...stats,
        hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      };
    } catch (error) {
      return {
        hits: 0,
        misses: 0,
        keys: 0,
        memory: 0,
        hitRate: 0,
        error: error.message,
      };
    }
  }

  async getPerformanceMetrics(operation?: string): Promise<any> {
    const pattern = operation ? `metrics:${operation}:*` : 'metrics:*';
    const keys = await this.redis.keys(pattern);

    const metrics = await Promise.all(
      keys.map(async (key) => {
        const data = await this.redis.get(key);
        return JSON.parse(data);
      }),
    );

    const analysis = {
      totalOperations: metrics.length,
      successRate:
        metrics.filter((m) => m.success).length / metrics.length || 0,
      averageDuration:
        metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length || 0,
      maxDuration: Math.max(...metrics.map((m) => m.duration), 0),
      minDuration: Math.min(...metrics.map((m) => m.duration), 0),
    };

    return {
      analysis,
      metrics: metrics.slice(-100),
    };
  }

  async getConcurrencyMetrics(venueId?: string): Promise<any> {
    const pattern = venueId ? `concurrency:${venueId}:*` : 'concurrency:*';
    const keys = await this.redis.keys(pattern);

    const events = await Promise.all(
      keys.map(async (key) => {
        const data = await this.redis.get(key);
        return JSON.parse(data);
      }),
    );

    const analysis = {
      totalEvents: events.length,
      lockAcquired: events.filter((e) => e.eventType === 'lock_acquired')
        .length,
      lockFailed: events.filter((e) => e.eventType === 'lock_failed').length,
      conflictDetected: events.filter(
        (e) => e.eventType === 'conflict_detected',
      ).length,
    };

    return {
      analysis,
      events: events.slice(-50),
    };
  }

  async cleanupOldMetrics(): Promise<void> {
    const oneDayAgo = Date.now() - 86400000;

    const metricKeys = await this.redis.keys('metrics:*');
    for (const key of metricKeys) {
      const timestamp = parseInt(key.split(':').pop());
      if (timestamp < oneDayAgo) {
        await this.redis.del(key);
      }
    }

    const concurrencyKeys = await this.redis.keys('concurrency:*');
    for (const key of concurrencyKeys) {
      const timestamp = parseInt(key.split(':').pop());
      if (timestamp < oneDayAgo) {
        await this.redis.del(key);
      }
    }
  }
}
