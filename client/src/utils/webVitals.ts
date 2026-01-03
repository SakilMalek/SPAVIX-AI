/**
 * Web Vitals tracking for Core Web Vitals metrics
 * Tracks: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)
 */

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Track Core Web Vitals metrics
 */
export function trackWebVitals(callback: (metric: WebVitalsMetric) => void) {
  // Largest Contentful Paint (LCP)
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      const metric: WebVitalsMetric = {
        name: 'LCP',
        value: lastEntry.renderTime || lastEntry.loadTime,
        rating: getRating('LCP', lastEntry.renderTime || lastEntry.loadTime),
        delta: 0,
        id: `lcp-${Date.now()}`,
        navigationType: performance.navigation.type.toString(),
      };
      
      callback(metric);
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP observer not supported');
  }

  // First Input Delay (FID) / Interaction to Next Paint (INP)
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const metric: WebVitalsMetric = {
          name: 'FID',
          value: (entry as any).processingDuration,
          rating: getRating('FID', (entry as any).processingDuration),
          delta: 0,
          id: `fid-${Date.now()}`,
          navigationType: performance.navigation.type.toString(),
        };
        
        callback(metric);
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID observer not supported');
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          
          const metric: WebVitalsMetric = {
            name: 'CLS',
            value: clsValue,
            rating: getRating('CLS', clsValue),
            delta: (entry as any).value,
            id: `cls-${Date.now()}`,
            navigationType: performance.navigation.type.toString(),
          };
          
          callback(metric);
        }
      });
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS observer not supported');
  }
}

/**
 * Rate a metric as good, needs-improvement, or poor
 */
function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (metric) {
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'FID':
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    default:
      return 'needs-improvement';
  }
}

/**
 * Log Web Vitals metrics (development only)
 */
export function logWebVitals(metric: WebVitalsMetric) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
  }
}
