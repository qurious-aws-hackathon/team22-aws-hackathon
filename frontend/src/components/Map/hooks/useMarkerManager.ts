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
      const markerIcon = createMarkerIcon(place.category || '기타', isHighlighted);
      marker.setImage(markerIcon);
    });
  }, [createMarkerIcon]);

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
