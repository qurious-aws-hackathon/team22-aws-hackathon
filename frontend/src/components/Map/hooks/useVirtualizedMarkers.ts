import { useRef, useCallback, useMemo } from 'react';
import { Spot } from '../../../api';

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export const useVirtualizedMarkers = (mapInstance: any) => {
  const allMarkersRef = useRef<any[]>([]);
  const visibleMarkersRef = useRef<Set<string>>(new Set());
  const markerPoolRef = useRef<any[]>([]);
  const lastBoundsRef = useRef<ViewportBounds | null>(null);

  const VIEWPORT_PADDING = 0.01; // 뷰포트 패딩
  const MAX_VISIBLE_MARKERS = 500; // 최대 표시 마커 수
  const MARKER_POOL_SIZE = 100; // 마커 풀 크기

  const getViewportBounds = useCallback((): ViewportBounds | null => {
    if (!mapInstance) return null;

    const bounds = mapInstance.getBounds();
    return {
      north: bounds.getNorthEast().getLat() + VIEWPORT_PADDING,
      south: bounds.getSouthWest().getLat() - VIEWPORT_PADDING,
      east: bounds.getNorthEast().getLng() + VIEWPORT_PADDING,
      west: bounds.getSouthWest().getLng() - VIEWPORT_PADDING
    };
  }, [mapInstance]);

  const isInViewport = useCallback((place: Spot, bounds: ViewportBounds): boolean => {
    return place.lat >= bounds.south &&
           place.lat <= bounds.north &&
           place.lng >= bounds.west &&
           place.lng <= bounds.east;
  }, []);

  const createMarkerFromPool = useCallback(() => {
    if (markerPoolRef.current.length > 0) {
      return markerPoolRef.current.pop();
    }
    return null;
  }, []);

  const returnMarkerToPool = useCallback((marker: any) => {
    if (markerPoolRef.current.length < MARKER_POOL_SIZE) {
      marker.setMap(null);
      markerPoolRef.current.push(marker);
    } else {
      marker.setMap(null);
    }
  }, []);

  const prioritizeMarkers = useCallback((places: Spot[], bounds: ViewportBounds): Spot[] => {
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;

    return places
      .filter(place => isInViewport(place, bounds))
      .sort((a, b) => {
        // 거리 기반 우선순위
        const distA = Math.sqrt(Math.pow(a.lat - centerLat, 2) + Math.pow(a.lng - centerLng, 2));
        const distB = Math.sqrt(Math.pow(b.lat - centerLat, 2) + Math.pow(b.lng - centerLng, 2));
        
        // 좋아요 수 기반 우선순위 추가
        const scoreA = (a.like_count || 0) - distA * 100;
        const scoreB = (b.like_count || 0) - distB * 100;
        
        return scoreB - scoreA;
      })
      .slice(0, MAX_VISIBLE_MARKERS);
  }, [isInViewport]);

  const updateVisibleMarkers = useCallback((places: Spot[], createMarkerIcon: (category: string) => any, onMarkerClick?: (place: Spot) => void) => {
    if (!mapInstance) return;

    const bounds = getViewportBounds();
    if (!bounds) return;

    // 뷰포트가 크게 변경되지 않았다면 스킵
    if (lastBoundsRef.current) {
      const boundsChanged = Math.abs(bounds.north - lastBoundsRef.current.north) > 0.001 ||
                           Math.abs(bounds.south - lastBoundsRef.current.south) > 0.001 ||
                           Math.abs(bounds.east - lastBoundsRef.current.east) > 0.001 ||
                           Math.abs(bounds.west - lastBoundsRef.current.west) > 0.001;
      
      if (!boundsChanged) return;
    }

    lastBoundsRef.current = bounds;

    const prioritizedPlaces = prioritizeMarkers(places, bounds);
    const newVisibleIds = new Set(prioritizedPlaces.map(p => p.id));

    // 기존 마커 중 더 이상 보이지 않는 것들 제거
    visibleMarkersRef.current.forEach(markerId => {
      if (!newVisibleIds.has(markerId)) {
        const markerIndex = allMarkersRef.current.findIndex(m => m.placeId === markerId);
        if (markerIndex !== -1) {
          const marker = allMarkersRef.current[markerIndex];
          returnMarkerToPool(marker);
          allMarkersRef.current.splice(markerIndex, 1);
        }
      }
    });

    // 새로운 마커들 추가
    prioritizedPlaces.forEach(place => {
      if (!visibleMarkersRef.current.has(place.id)) {
        let marker = createMarkerFromPool();
        
        if (!marker) {
          const position = new window.kakao.maps.LatLng(place.lat, place.lng);
          const markerIcon = createMarkerIcon(place.category || '기타');

          marker = new window.kakao.maps.Marker({
            position,
            map: mapInstance,
            image: markerIcon
          });
        } else {
          // 풀에서 가져온 마커 재설정
          const position = new window.kakao.maps.LatLng(place.lat, place.lng);
          const markerIcon = createMarkerIcon(place.category || '기타');
          
          marker.setPosition(position);
          marker.setImage(markerIcon);
          marker.setMap(mapInstance);
        }

        marker.placeId = place.id;

        if (onMarkerClick) {
          window.kakao.maps.event.addListener(marker, 'click', () => {
            onMarkerClick(place);
          });
        }

        allMarkersRef.current.push(marker);
      }
    });

    visibleMarkersRef.current = newVisibleIds;

    console.log(`🎯 가상화된 마커 업데이트: ${visibleMarkersRef.current.size}/${places.length} 표시`);
  }, [mapInstance, getViewportBounds, prioritizeMarkers, createMarkerFromPool, returnMarkerToPool]);

  const clearAllMarkers = useCallback(() => {
    allMarkersRef.current.forEach(marker => {
      returnMarkerToPool(marker);
    });
    allMarkersRef.current = [];
    visibleMarkersRef.current.clear();
    lastBoundsRef.current = null;
  }, [returnMarkerToPool]);

  const getVisibleMarkerCount = useCallback(() => {
    return visibleMarkersRef.current.size;
  }, []);

  const highlightVisibleMarkers = useCallback((highlightedPlaceIds: string[], createMarkerIcon: (category: string, highlighted?: boolean) => any) => {
    allMarkersRef.current.forEach(marker => {
      const isHighlighted = highlightedPlaceIds.includes(marker.placeId);
      // 하이라이트 로직은 기존 마커 매니저와 동일하게 구현
      // 여기서는 간단히 표시만
      if (isHighlighted) {
        console.log(`🔥 마커 하이라이트: ${marker.placeId}`);
      }
    });
  }, []);

  return {
    updateVisibleMarkers,
    clearAllMarkers,
    getVisibleMarkerCount,
    highlightVisibleMarkers,
    visibleMarkers: allMarkersRef.current
  };
};
