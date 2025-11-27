/**
 * Performance monitoring utilities
 * Tracks Core Web Vitals and custom metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

// Core Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint
};

/**
 * Get performance rating based on value and thresholds
 */
function getRating(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report metric to analytics
 */
function reportMetric(metric: PerformanceMetric): void {
  console.log('[Performance]', metric.name, metric.value, metric.rating);
  
  // Send to analytics service (Google Analytics, custom backend, etc.)
  if (window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.rating,
      non_interaction: true,
    });
  }
}

/**
 * Measure Largest Contentful Paint (LCP)
 */
export function measureLCP(callback?: (metric: PerformanceMetric) => void): void {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        
        const metric: PerformanceMetric = {
          name: 'LCP',
          value: lastEntry.startTime,
          rating: getRating(lastEntry.startTime, THRESHOLDS.LCP),
          timestamp: Date.now(),
        };
        
        reportMetric(metric);
        if (callback) callback(metric);
      });
      
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
      console.warn('[Performance] LCP measurement failed:', error);
    }
  }
}

/**
 * Measure First Input Delay (FID)
 */
export function measureFID(callback?: (metric: PerformanceMetric) => void): void {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry: any) => {
          const metric: PerformanceMetric = {
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: getRating(entry.processingStart - entry.startTime, THRESHOLDS.FID),
            timestamp: Date.now(),
          };
          
          reportMetric(metric);
          if (callback) callback(metric);
        });
      });
      
      observer.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      console.warn('[Performance] FID measurement failed:', error);
    }
  }
}

/**
 * Measure Cumulative Layout Shift (CLS)
 */
export function measureCLS(callback?: (metric: PerformanceMetric) => void): void {
  if ('PerformanceObserver' in window) {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        const metric: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating(clsValue, THRESHOLDS.CLS),
          timestamp: Date.now(),
        };
        
        reportMetric(metric);
        if (callback) callback(metric);
      });
      
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      console.warn('[Performance] CLS measurement failed:', error);
    }
  }
}

/**
 * Measure First Contentful Paint (FCP)
 */
export function measureFCP(callback?: (metric: PerformanceMetric) => void): void {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
        
        if (fcpEntry) {
          const metric: PerformanceMetric = {
            name: 'FCP',
            value: fcpEntry.startTime,
            rating: getRating(fcpEntry.startTime, THRESHOLDS.FCP),
            timestamp: Date.now(),
          };
          
          reportMetric(metric);
          if (callback) callback(metric);
          observer.disconnect();
        }
      });
      
      observer.observe({ type: 'paint', buffered: true });
    } catch (error) {
      console.warn('[Performance] FCP measurement failed:', error);
    }
  }
}

/**
 * Measure Time to First Byte (TTFB)
 */
export function measureTTFB(callback?: (metric: PerformanceMetric) => void): void {
  if ('performance' in window && 'timing' in window.performance) {
    const timing = performance.timing as PerformanceTiming;
    const ttfb = timing.responseStart - timing.requestStart;
    
    const metric: PerformanceMetric = {
      name: 'TTFB',
      value: ttfb,
      rating: getRating(ttfb, THRESHOLDS.TTFB),
      timestamp: Date.now(),
    };
    
    reportMetric(metric);
    if (callback) callback(metric);
  }
}

/**
 * Measure all Core Web Vitals
 */
export function measureAllCoreWebVitals(callback?: (metric: PerformanceMetric) => void): void {
  measureLCP(callback);
  measureFID(callback);
  measureCLS(callback);
  measureFCP(callback);
  measureTTFB(callback);
}

/**
 * Get page load time
 */
export function getPageLoadTime(): number {
  if ('performance' in window && 'timing' in window.performance) {
    const timing = performance.timing as PerformanceTiming;
    return timing.loadEventEnd - timing.navigationStart;
  }
  return 0;
}

/**
 * Get DOM content loaded time
 */
export function getDOMContentLoadedTime(): number {
  if ('performance' in window && 'timing' in window.performance) {
    const timing = performance.timing as PerformanceTiming;
    return timing.domContentLoadedEventEnd - timing.navigationStart;
  }
  return 0;
}

/**
 * Get resource loading times
 */
export function getResourceLoadingTimes(): Array<{ name: string; duration: number; size?: number }> {
  if ('performance' in window && 'getEntriesByType' in window.performance) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    return resources.map((resource) => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize,
    }));
  }
  
  return [];
}

/**
 * Get memory usage (Chrome only)
 */
export function getMemoryUsage(): { used: number; total: number } | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
    };
  }
  return null;
}

/**
 * Mark custom performance timing
 */
export function mark(name: string): void {
  if ('performance' in window && 'mark' in window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure time between two marks
 */
export function measure(name: string, startMark: string, endMark: string): number {
  if ('performance' in window && 'measure' in window.performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      return measure ? measure.duration : 0;
    } catch (error) {
      console.warn('[Performance] Measure failed:', error);
      return 0;
    }
  }
  return 0;
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceData(): void {
  if ('performance' in window) {
    if ('clearMarks' in performance) performance.clearMarks();
    if ('clearMeasures' in performance) performance.clearMeasures();
  }
}

/**
 * Get performance report
 */
export interface PerformanceReport {
  pageLoadTime: number;
  domContentLoadedTime: number;
  resources: Array<{ name: string; duration: number; size?: number }>;
  memory: { used: number; total: number } | null;
  timestamp: number;
}

export function getPerformanceReport(): PerformanceReport {
  return {
    pageLoadTime: getPageLoadTime(),
    domContentLoadedTime: getDOMContentLoadedTime(),
    resources: getResourceLoadingTimes(),
    memory: getMemoryUsage(),
    timestamp: Date.now(),
  };
}

/**
 * Start performance monitoring
 */
export function startPerformanceMonitoring(interval: number = 30000): () => void {
  console.log('[Performance] Monitoring started');
  
  // Measure Core Web Vitals on load
  if (document.readyState === 'complete') {
    measureAllCoreWebVitals();
  } else {
    window.addEventListener('load', () => {
      measureAllCoreWebVitals();
    });
  }
  
  // Periodic monitoring
  const intervalId = setInterval(() => {
    const report = getPerformanceReport();
    console.log('[Performance] Report:', report);
  }, interval);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('[Performance] Monitoring stopped');
  };
}

// Add gtag types
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
