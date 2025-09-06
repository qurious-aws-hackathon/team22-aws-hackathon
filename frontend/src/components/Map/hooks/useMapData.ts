import { useState, useCallback, useRef, useEffect } from 'react';
import { api, RealtimePopulationData } from '../../../api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = 300000) { // 5분 기본 TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const useMapData = () => {
  const [populationData, setPopulationData] = useState<RealtimePopulationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef(new DataCache());
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPopulationData = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'population-data';
    
    // Check cache first
    if (!forceRefresh) {
      const cachedData = cacheRef.current.get<RealtimePopulationData[]>(cacheKey);
      if (cachedData) {
        setPopulationData(cachedData);
        return cachedData;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.population.getRealtimePopulation();
      
      let populationArray: RealtimePopulationData[] = [];
      if (response && (response as any).data && Array.isArray((response as any).data)) {
        populationArray = (response as any).data;
      } else if (response && Array.isArray(response)) {
        populationArray = response;
      }

      // Cache the data
      cacheRef.current.set(cacheKey, populationArray, 300000); // 5분 캐시
      
      setPopulationData(populationArray);
      setIsLoading(false);
      
      return populationArray;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      console.error('실시간 인구밀도 데이터 로드 실패:', error);
      setError('데이터를 불러올 수 없습니다.');
      setPopulationData([]);
      setIsLoading(false);
      
      throw error;
    }
  }, []);

  const refreshData = useCallback(() => {
    return loadPopulationData(true);
  }, [loadPopulationData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadPopulationData(true);
    }, 300000); // 5분

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadPopulationData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    populationData,
    isLoading,
    error,
    loadPopulationData,
    refreshData
  };
};
