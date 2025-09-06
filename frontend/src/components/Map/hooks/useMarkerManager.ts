import { useRef, useCallback } from 'react';
import { Spot } from '../../../api';

interface MarkerConfig {
  emoji: string;
  color: string;
}

const CATEGORY_CONFIG: Record<string, MarkerConfig> = {
  '카페': { emoji: '☕', color: '#FF6B9D' },
  '도서관': { emoji: '📚', color: '#4ECDC4' },
  '공원': { emoji: '🌳', color: '#45B7D1' },
  '기타': { emoji: '📍', color: '#96CEB4' }
};

export const useMarkerManager = (mapInstance: any) => {
  const markersRef = useRef<any[]>([]);
  const markersPlacesRef = useRef<Spot[]>([]);
  const markerImageCache = useRef<Map<string, any>>(new Map());
  const animationIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const originalPositionsRef = useRef<Map<string, any>>(new Map());

  const startMarkerAnimation = useCallback((marker: any, placeId: string) => {
    // 기존 애니메이션이 있다면 정리
    const existingInterval = animationIntervalsRef.current.get(placeId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 원래 위치 저장
    const originalPosition = marker.getPosition();
    originalPositionsRef.current.set(placeId, originalPosition);

    let animationStep = 0;
    const animationSpeed = 50; // ms
    const bounceHeight = 0.0001; // 위도 단위 (약 10m)

    const interval = setInterval(() => {
      animationStep += 0.2;
      const offset = Math.sin(animationStep) * bounceHeight;
      const newLat = originalPosition.getLat() + offset;
      
      const newPosition = new window.kakao.maps.LatLng(newLat, originalPosition.getLng());
      marker.setPosition(newPosition);
    }, animationSpeed);

    animationIntervalsRef.current.set(placeId, interval);
  }, []);

  const stopMarkerAnimation = useCallback((marker: any, placeId: string) => {
    const interval = animationIntervalsRef.current.get(placeId);
    if (interval) {
      clearInterval(interval);
      animationIntervalsRef.current.delete(placeId);
    }

    // 원래 위치로 복원
    const originalPosition = originalPositionsRef.current.get(placeId);
    if (originalPosition) {
      marker.setPosition(originalPosition);
      originalPositionsRef.current.delete(placeId);
    }
  }, []);

  const createMarkerIcon = useCallback((category: string, isHighlighted = false) => {
    const cacheKey = `${category}-${isHighlighted}`;
    
    if (markerImageCache.current.has(cacheKey)) {
      return markerImageCache.current.get(cacheKey);
    }

    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['기타'];
    const strokeColor = isHighlighted ? '#FF0000' : 'white';
    const strokeWidth = isHighlighted ? 4 : 3;

    const svgContent = `
      <svg width="60" height="75" viewBox="0 0 60 75" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow-${cacheKey}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <path d="M30 5C16.193 5 5 16.193 5 30c0 22.5 25 40 25 40s25-17.5 25-40C55 16.193 43.807 5 30 5z" 
              fill="${config.color}" 
              stroke="${strokeColor}" 
              stroke-width="${strokeWidth}"
              filter="url(#shadow-${cacheKey})"/>
        <circle cx="30" cy="30" r="18" fill="white" opacity="0.9"/>
        <text x="30" y="38" text-anchor="middle" font-size="24" fill="${config.color}">${config.emoji}</text>
      </svg>
    `;

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const markerImage = new window.kakao.maps.MarkerImage(
      svgUrl,
      new window.kakao.maps.Size(60, 75),
      { offset: new window.kakao.maps.Point(30, 75) }
    );

    markerImageCache.current.set(cacheKey, markerImage);
    return markerImage;
  }, []);

  const clearMarkers = useCallback(() => {
    // 모든 애니메이션 정리
    animationIntervalsRef.current.forEach((interval) => {
      clearInterval(interval);
    });
    animationIntervalsRef.current.clear();
    originalPositionsRef.current.clear();
    
    // 마커 정리
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    markersPlacesRef.current = [];
  }, []);

  const updateMarkers = useCallback((places: Spot[], onMarkerClick?: (place: Spot) => void) => {
    if (!mapInstance) return;

    clearMarkers();

    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      const markerIcon = createMarkerIcon(place.category || '기타');

      const marker = new window.kakao.maps.Marker({
        position,
        map: mapInstance,
        image: markerIcon
      });

      if (onMarkerClick) {
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(place);
        });
      }

      markersRef.current.push(marker);
      markersPlacesRef.current.push(place);
    });
  }, [mapInstance, createMarkerIcon, clearMarkers]);

  const highlightMarkers = useCallback((highlightedPlaceIds: string[]) => {
    markersRef.current.forEach((marker, index) => {
      const place = markersPlacesRef.current[index];
      if (!place) return;

      const isHighlighted = highlightedPlaceIds.includes(place.id);
      
      if (isHighlighted) {
        // 빨간 테두리 마커로 변경
        const markerIcon = createMarkerIcon(place.category || '기타', true);
        marker.setImage(markerIcon);
        // 애니메이션 시작
        startMarkerAnimation(marker, place.id);
      } else {
        // 일반 마커로 변경
        const markerIcon = createMarkerIcon(place.category || '기타', false);
        marker.setImage(markerIcon);
        // 애니메이션 정지
        stopMarkerAnimation(marker, place.id);
      }
    });
  }, [createMarkerIcon, startMarkerAnimation, stopMarkerAnimation]);

  const getMarkerByPlaceId = useCallback((placeId: string) => {
    const index = markersPlacesRef.current.findIndex(p => p.id === placeId);
    return index !== -1 ? markersRef.current[index] : null;
  }, []);

  return {
    updateMarkers,
    highlightMarkers,
    clearMarkers,
    getMarkerByPlaceId,
    markers: markersRef.current,
    places: markersPlacesRef.current
  };
};
