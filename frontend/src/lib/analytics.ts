import { useEffect, useCallback } from 'react';
import { addBreadcrumb } from './errorTracking';

/**
 * Performance monitoring and analytics for frontend
 *
 * Features:
 * - Page load performance tracking
 * - Component render performance
 * - API request timing
 * - User interaction tracking
 * - Custom performance metrics
 * - Web Vitals monitoring
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp?: number;
}

/**
 * Performance metrics collector
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  /**
   * Record a metric
   */
  recordMetric(metric: PerformanceMetric) {
    const fullMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    };

    this.metrics.push(fullMetric);

    // Log to console in development
    if (import.meta.env.MODE === 'development') {
      console.log('[Performance]', fullMetric);
    }

    // Send to backend or analytics service
    this.sendMetric(fullMetric);
  }

  /**
   * Start a timer for an operation
   */
  startTimer(name: string) {
    this.timers.set(name, performance.now());
  }

  /**
   * End a timer and record the duration
   */
  endTimer(name: string, tags?: Record<string, string>) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer "${name}" was not started`);
      return;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name: `${name}Duration`,
      value: duration,
      unit: 'ms',
      tags,
    });

    return duration;
  }

  /**
   * Send metric to backend (placeholder for actual implementation)
   */
  private async sendMetric(metric: PerformanceMetric) {
    // In production, send to backend API or analytics service
    // For now, just add a breadcrumb for Sentry
    addBreadcrumb(
      `Performance: ${metric.name}`,
      'performance',
      'info',
      {
        value: metric.value,
        unit: metric.unit,
        ...metric.tags,
      }
    );
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Track page load performance
 */
export function trackPageLoad() {
  if (typeof window === 'undefined') return;

  // Wait for page to fully load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        // DNS lookup time
        performanceMonitor.recordMetric({
          name: 'PageLoad.DNSLookup',
          value: navigation.domainLookupEnd - navigation.domainLookupStart,
          unit: 'ms',
        });

        // TCP connection time
        performanceMonitor.recordMetric({
          name: 'PageLoad.TCPConnection',
          value: navigation.connectEnd - navigation.connectStart,
          unit: 'ms',
        });

        // Request time
        performanceMonitor.recordMetric({
          name: 'PageLoad.Request',
          value: navigation.responseStart - navigation.requestStart,
          unit: 'ms',
        });

        // Response time
        performanceMonitor.recordMetric({
          name: 'PageLoad.Response',
          value: navigation.responseEnd - navigation.responseStart,
          unit: 'ms',
        });

        // DOM processing time
        performanceMonitor.recordMetric({
          name: 'PageLoad.DOMProcessing',
          value: navigation.domContentLoadedEventEnd - navigation.responseEnd,
          unit: 'ms',
        });

        // Total page load time
        performanceMonitor.recordMetric({
          name: 'PageLoad.Total',
          value: navigation.loadEventEnd - navigation.fetchStart,
          unit: 'ms',
        });
      }
    }, 0);
  });
}

/**
 * Track API request performance
 */
export function trackApiRequest(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
) {
  performanceMonitor.recordMetric({
    name: 'API.RequestDuration',
    value: duration,
    unit: 'ms',
    tags: {
      endpoint,
      method,
      statusCode: String(statusCode),
      success: String(statusCode >= 200 && statusCode < 300),
    },
  });
}

/**
 * Track component render performance
 */
export function trackComponentRender(componentName: string, duration: number) {
  performanceMonitor.recordMetric({
    name: 'Component.RenderDuration',
    value: duration,
    unit: 'ms',
    tags: {
      component: componentName,
    },
  });
}

/**
 * Track user interaction
 */
export function trackUserInteraction(action: string, element: string, metadata?: Record<string, any>) {
  addBreadcrumb(
    `User Interaction: ${action}`,
    'user-interaction',
    'info',
    {
      action,
      element,
      ...metadata,
    }
  );

  performanceMonitor.recordMetric({
    name: 'User.Interaction',
    value: 1,
    unit: 'count',
    tags: {
      action,
      element,
    },
  });
}

/**
 * Track navigation
 */
export function trackNavigation(from: string, to: string) {
  addBreadcrumb(
    `Navigation: ${from} → ${to}`,
    'navigation',
    'info',
    {
      from,
      to,
    }
  );

  performanceMonitor.recordMetric({
    name: 'Navigation.Change',
    value: 1,
    unit: 'count',
    tags: {
      from,
      to,
    },
  });
}

/**
 * Track Web Vitals (Core Web Vitals)
 */
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    performanceMonitor.recordMetric({
      name: 'WebVitals.LCP',
      value: lastEntry.startTime,
      unit: 'ms',
    });
  });
  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // LCP not supported
  }

  // First Input Delay (FID)
  const fidObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      performanceMonitor.recordMetric({
        name: 'WebVitals.FID',
        value: entry.processingStart - entry.startTime,
        unit: 'ms',
      });
    });
  });
  try {
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // FID not supported
  }

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as any[]) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
  });
  try {
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    // Report CLS when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        performanceMonitor.recordMetric({
          name: 'WebVitals.CLS',
          value: clsValue,
          unit: 'score',
        });
      }
    });
  } catch (e) {
    // CLS not supported
  }
}

/**
 * React hook to track component render performance
 */
export function useRenderPerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      trackComponentRender(componentName, duration);
    };
  }, [componentName]);
}

/**
 * React hook to track page view
 */
export function usePageView(pageName: string) {
  useEffect(() => {
    addBreadcrumb(
      `Page View: ${pageName}`,
      'navigation',
      'info',
      {
        page: pageName,
        url: window.location.href,
      }
    );

    performanceMonitor.recordMetric({
      name: 'Page.View',
      value: 1,
      unit: 'count',
      tags: {
        page: pageName,
      },
    });
  }, [pageName]);
}

/**
 * React hook to track API calls
 */
export function useApiTracking() {
  const trackApi = useCallback(
    (endpoint: string, method: string, duration: number, statusCode: number) => {
      trackApiRequest(endpoint, method, duration, statusCode);
    },
    []
  );

  return { trackApi };
}

/**
 * Track document processing performance
 */
export function trackDocumentProcessing(
  operation: string,
  documentType: string,
  duration: number,
  success: boolean
) {
  performanceMonitor.recordMetric({
    name: 'Document.ProcessingDuration',
    value: duration,
    unit: 'ms',
    tags: {
      operation,
      documentType,
      success: String(success),
    },
  });
}

/**
 * Track letter generation performance
 */
export function trackLetterGeneration(duration: number, success: boolean, letterLength?: number) {
  performanceMonitor.recordMetric({
    name: 'Letter.GenerationDuration',
    value: duration,
    unit: 'ms',
    tags: {
      success: String(success),
    },
  });

  if (letterLength) {
    performanceMonitor.recordMetric({
      name: 'Letter.Length',
      value: letterLength,
      unit: 'characters',
    });
  }
}

/**
 * Track real-time collaboration metrics
 */
export function trackCollaboration(event: string, metadata?: Record<string, any>) {
  performanceMonitor.recordMetric({
    name: 'Collaboration.Event',
    value: 1,
    unit: 'count',
    tags: {
      event,
      ...metadata,
    },
  });
}

/**
 * Initialize analytics
 */
export function initAnalytics() {
  // Track initial page load
  trackPageLoad();

  // Track Web Vitals
  trackWebVitals();

  console.info('Analytics initialized');
}

/**
 * Higher-order function to measure async operation duration
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  performanceMonitor.startTimer(name);
  try {
    const result = await fn();
    performanceMonitor.endTimer(name, { ...tags, success: 'true' });
    return result;
  } catch (error) {
    performanceMonitor.endTimer(name, { ...tags, success: 'false' });
    throw error;
  }
}

/**
 * Function to measure sync operation duration
 */
export function measure<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  performanceMonitor.startTimer(name);
  try {
    const result = fn();
    performanceMonitor.endTimer(name, { ...tags, success: 'true' });
    return result;
  } catch (error) {
    performanceMonitor.endTimer(name, { ...tags, success: 'false' });
    throw error;
  }
}
