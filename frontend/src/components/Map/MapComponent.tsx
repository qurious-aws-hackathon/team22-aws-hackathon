import React, { useEffect, useRef, useState } from 'react';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  noiseScore: number;
  crowdScore: number;
}

interface MapComponentProps {
  places: Place[];
  center: { lat: number; lng: number };
  onMarkerClick?: (place: Place) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ places, center, onMarkerClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [showCongestion, setShowCongestion] = useState(true);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || !(window as any).kakao?.maps) return;

    const kakaoMap = new (window as any).kakao.maps.Map(mapRef.current, {
      center: new (window as any).kakao.maps.LatLng(center.lat, center.lng),
      level: 3
    });

    setMap(kakaoMap);
  }, [center]);

  useEffect(() => {
    if (!map || !(window as any).kakao?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    // Create new markers
    places.forEach(place => {
      try {
        const marker = new (window as any).kakao.maps.Marker({
          position: new (window as any).kakao.maps.LatLng(place.latitude, place.longitude),
          map: map
        });

        if (onMarkerClick) {
          (window as any).kakao.maps.event.addListener(marker, 'click', () => {
            onMarkerClick(place);
          });
        }

        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error creating marker:', error);
      }
    });

    return () => {
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    };
  }, [map, places, onMarkerClick]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '400px' }} />
      
      {/* 혼잡도 토글 버튼 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowCongestion(!showCongestion)}
          style={{
            padding: '10px 15px',
            backgroundColor: showCongestion ? '#FF6B35' : '#fff',
            color: showCongestion ? '#fff' : '#333',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            minWidth: '100px'
          }}
        >
          실시간 혼잡도 {showCongestion ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};

export default MapComponent;
