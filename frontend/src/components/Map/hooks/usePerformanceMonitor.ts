import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  markerCount: number;
  overlayCount: number;
  memoryUsage?: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback((markerCount: number = 0, overlayCount: number = 0) => {
    const renderTime = performance.now() - renderStartTime.current;
    
    const metrics: PerformanceMetrics = {
      renderTime,
      markerCount,
      overlayCount
    };

    // Add memory usage if available
    if ('memory' in performance) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    metricsRef.current.push(metrics);

    // Keep only last 10 measurements
    if (metricsRef.current.length > 10) {
      metricsRef.current.shift();
    }

    // Log performance warnings
    if (renderTime > 100) {
      console.warn(`🐌 ${componentName} 렌더링 시간이 느립니다: ${renderTime.toFixed(2)}ms`);
    }

    if (markerCount > 1000) {
      console.warn(`🎯 ${componentName} 마커 수가 많습니다: ${markerCount}개`);
    }

    console.log(`⚡ ${componentName} 성능:`, {
      renderTime: `${renderTime.toFixed(2)}ms`,
      markers: markerCount,
      overlays: overlayCount
    });
  }, [componentName]);

  const getAverageRenderTime = useCallback(() => {
    if (metricsRef.current.length === 0) return 0;
    
    const total = metricsRef.current.reduce((sum, metric) => sum + metric.renderTime, 0);
    return total / metricsRef.current.length;
  }, []);

  const getMetrics = useCallback(() => {
    return {
      current: metricsRef.current[metricsRef.current.length - 1],
      average: getAverageRenderTime(),
      history: [...metricsRef.current]
    };
  }, [getAverageRenderTime]);

  // Monitor component mount/unmount
  useEffect(() => {
    console.log(`🚀 ${componentName} 마운트됨`);
    
    return () => {
      console.log(`🔄 ${componentName} 언마운트됨`);
      const avgRenderTime = getAverageRenderTime();
      if (avgRenderTime > 0) {
        console.log(`📊 ${componentName} 평균 렌더링 시간: ${avgRenderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, getAverageRenderTime]);

  return {
    startRender,
    endRender,
    getMetrics
  };
};
