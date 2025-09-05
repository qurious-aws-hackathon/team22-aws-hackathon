import { useEffect, useRef, useState } from 'react';
import { type Spot, api } from '../api';
import PinRegistrationModal from './PinRegistrationModal';

interface MapProps {
  places: Spot[];
  onPlaceClick?: (place: Spot) => void;
  selectedSpot?: Spot | null;
  onSpotsUpdate?: () => void;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  lat: number;
  lng: number;
}

const Map: React.FC<MapProps> = ({ places, onPlaceClick, selectedSpot, onSpotsUpdate }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    lat: 0,
    lng: 0
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalData, setPinModalData] = useState({ lat: 0, lng: 0 });

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (mapInstance.current && places.length > 0) {
      updateMarkers();
    }
  }, [places]);

  useEffect(() => {
    if (selectedSpot && mapInstance.current) {
      moveToSpot(selectedSpot);
    }
  }, [selectedSpot]);

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const initializeMap = () => {
    if (mapRef.current && (window as any).kakao?.maps) {
      const options = {
        center: new (window as any).kakao.maps.LatLng(37.5665, 126.9780),
        level: 8
      };
      
      mapInstance.current = new (window as any).kakao.maps.Map(mapRef.current, options);
      
      // Kakao Maps API 우클릭 이벤트 (가장 정확함)
      (window as any).kakao.maps.event.addListener(mapInstance.current, 'rightclick', (mouseEvent: any) => {
        console.log('=== 우클릭 이벤트 상세 정보 ===');
        console.log('전체 mouseEvent:', mouseEvent);
        
        const latlng = mouseEvent.latLng;
        const lat = latlng.getLat();
        const lng = latlng.getLng();
        
        console.log('추출된 좌표:');
        console.log('- 위도 (lat):', lat);
        console.log('- 경도 (lng):', lng);
        console.log('- 좌표 정밀도:', lat.toFixed(8), lng.toFixed(8));
        
        // 좌표 검증을 위한 역변환 테스트
        const testLatLng = new (window as any).kakao.maps.LatLng(lat, lng);
        console.log('역변환 테스트:', testLatLng.getLat(), testLatLng.getLng());
        
        // 화면 좌표 계산 (메뉴 위치용)
        const rect = mapRef.current!.getBoundingClientRect();
        let screenX = rect.left + rect.width / 2;
        let screenY = rect.top + rect.height / 2;
        
        // 더 정확한 화면 좌표 계산 시도
        try {
          const projection = mapInstance.current.getProjection();
          const mapCenter = mapInstance.current.getCenter();
          const mapCenterPixel = projection.pointFromCoords(mapCenter);
          const clickPixel = projection.pointFromCoords(latlng);
          
          const offsetX = clickPixel.x - mapCenterPixel.x;
          const offsetY = clickPixel.y - mapCenterPixel.y;
          
          screenX = rect.left + rect.width / 2 + offsetX;
          screenY = rect.top + rect.height / 2 + offsetY;
          
          console.log('화면 좌표 계산:');
          console.log('- 지도 중심 픽셀:', mapCenterPixel.x, mapCenterPixel.y);
          console.log('- 클릭 픽셀:', clickPixel.x, clickPixel.y);
          console.log('- 오프셋:', offsetX, offsetY);
          console.log('- 최종 화면 좌표:', screenX, screenY);
        } catch (error) {
          console.log('화면 좌표 계산 실패, 기본값 사용:', error);
        }
        
        setContextMenu({
          visible: true,
          x: screenX,
          y: screenY,
          lat,
          lng
        });
        
        console.log('=== 컨텍스트 메뉴 설정 완료 ===');
      });
      
      // 브라우저 기본 우클릭 메뉴 차단
      mapRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
      });
      
      // 지도 클릭 이벤트로 좌표 정확도 테스트
      (window as any).kakao.maps.event.addListener(mapInstance.current, 'click', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        console.log('일반 클릭 좌표 (참고용):', latlng.getLat(), latlng.getLng());
      });
    }
  };

  const moveToSpot = (spot: Spot) => {
    if (!mapInstance.current) return;

    const moveLatLng = new (window as any).kakao.maps.LatLng(spot.lat, spot.lng);
    
    mapInstance.current.setCenter(moveLatLng);
    mapInstance.current.setLevel(3);
    
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.relayout();
      }
    }, 100);
  };

  const updateMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    places.forEach(place => {
      const position = new (window as any).kakao.maps.LatLng(place.lat, place.lng);
      
      const marker = new (window as any).kakao.maps.Marker({
        position,
        map: mapInstance.current
      });

      (window as any).kakao.maps.event.addListener(marker, 'click', () => {
        onPlaceClick?.(place);
      });

      markersRef.current.push(marker);
    });
  };

  const addCurrentLocationMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
    }

    const position = new (window as any).kakao.maps.LatLng(lat, lng);
    
    const imageSrc = 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `);
    
    const imageSize = new (window as any).kakao.maps.Size(32, 32);
    const markerImage = new (window as any).kakao.maps.MarkerImage(imageSrc, imageSize);
    
    currentLocationMarkerRef.current = new (window as any).kakao.maps.Marker({
      position,
      image: markerImage,
      map: mapInstance.current
    });
  };

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('위치 서비스를 지원하지 않는 브라우저입니다.');
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const moveLatLng = new (window as any).kakao.maps.LatLng(latitude, longitude);
        
        if (mapInstance.current) {
          mapInstance.current.setCenter(moveLatLng);
          mapInstance.current.setLevel(3);
          
          addCurrentLocationMarker(latitude, longitude);
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error('위치 정보를 가져올 수 없습니다:', error);
        alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleContextMenuAction = (action: string) => {
    const { lat, lng } = contextMenu;
    
    switch (action) {
      case 'register':
        setPinModalData({ lat, lng });
        setShowPinModal(true);
        break;
      case 'start':
        alert(`출발지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
      case 'waypoint':
        alert(`경유지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
      case 'destination':
        alert(`도착지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
    }
    
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePinRegistration = async (data: {
    name: string;
    description: string;
    category: string;
    noiseLevel: number;
    rating: number;
    image?: File;
    isNoiseRecorded: boolean;
  }) => {
    try {
      // 조용함 점수 계산 (소음도 기반)
      const quietRating = Math.max(10, Math.min(100, 100 - (data.noiseLevel - 20) * 1.5));
      
      const spotData = {
        name: data.name,
        description: data.description,
        lat: pinModalData.lat,
        lng: pinModalData.lng,
        category: data.category,
        noise_level: data.noiseLevel,
        rating: data.rating,
        quiet_rating: Math.round(quietRating),
        is_noise_recorded: data.isNoiseRecorded,
        // TODO: 이미지 업로드 처리 (S3 등)
        // image_url: uploadedImageUrl
      };

      console.log('API 호출 데이터:', spotData);
      
      // API 호출
      await api.spots.createSpot(spotData);
      
      alert(`"${data.name}" 장소가 성공적으로 등록되었습니다!`);
      
      // 스팟 목록 새로고침
      if (onSpotsUpdate) {
        onSpotsUpdate();
      }
      
    } catch (error) {
      console.error('스팟 등록 실패:', error);
      alert('스팟 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 2000,
            minWidth: '120px',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('register')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            📍 핀 등록
          </div>
          
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('start')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🚀 출발지
          </div>
          
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('waypoint')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🔄 경유지
          </div>
          
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('destination')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🏁 도착지
          </div>
        </div>
      )}
      
      <button
        onClick={moveToCurrentLocation}
        disabled={isLocating}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          cursor: isLocating ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          zIndex: 1000,
          opacity: isLocating ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
        title="내 위치로 이동"
      >
        {isLocating ? '⏳' : '📍'}
      </button>

      <PinRegistrationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        lat={pinModalData.lat}
        lng={pinModalData.lng}
        onSubmit={handlePinRegistration}
      />
    </div>
  );
};

export default Map;
