/**
 * Performance monitoring utility for tracking page load times and API response times
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Start measuring a performance metric
   */
  startMeasure(name: string) {
    this.marks.set(name, performance.now());
  }

  /**
   * End measuring a performance metric and store it
   */
  endMeasure(name: string) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No start mark found for ${name}`);
      return;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    this.marks.delete(name);

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Get average duration for a specific metric
   */
  getAverageDuration(name: string) {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;
    
    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / relevantMetrics.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Log metrics to console (development only)
   */
  logMetrics() {
    if (process.env.NODE_ENV === 'development') {
      console.table(this.metrics);
    }
  }

  /**
   * Send metrics to analytics service
   */
  async sendMetrics(endpoint: string) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: this.metrics,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook for measuring React component render times
 */
export function useMeasurePerformance(componentName: string) {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  };
}
