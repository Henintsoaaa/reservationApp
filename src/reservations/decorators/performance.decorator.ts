import { Injectable } from '@nestjs/common';

export function MeasurePerformance(operationName?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const operation =
      operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let result: any;

      try {
        result = await method.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;

        if (
          this.metricsService &&
          typeof this.metricsService.recordPerformanceMetric === 'function'
        ) {
          this.metricsService.recordPerformanceMetric(
            operation,
            duration,
            success,
          );
        }
      }
    };
  };
}

export function CacheResult(
  keyGenerator: (args: any[]) => string,
  ttl: number = 300,
  invalidateOn?: string[],
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(args);

      if (this.cacheManager) {
        const cachedResult = await this.cacheManager.get(cacheKey);
        if (cachedResult) {
          return cachedResult;
        }
      }

      const result = await method.apply(this, args);

      if (this.cacheManager && result) {
        await this.cacheManager.set(cacheKey, result, ttl);
      }

      return result;
    };
  };
}
