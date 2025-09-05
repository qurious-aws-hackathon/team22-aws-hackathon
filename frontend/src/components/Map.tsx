import { useEffect, useRef, useState } from 'react';
import { type Spot, api } from '../api';
import PinRegistrationModal from './PinRegistrationModal';
import Alert from './Alert';
import Loading from './Loading';
import PlacePopulation from './Map/PlacePopulation';
import { useAlert } from '../hooks/useAlert';
import { useLoading } from '../hooks/useLoading';

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
  const markersPlacesRef = useRef<Spot[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const crowdPolygonsRef = useRef<any[]>([]);
  const noiseCirclesRef = useRef<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [populationData, setPopulationData] = useState<any[]>([]);
  const [showCongestion, setShowCongestion] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    lat: 0,
    lng: 0
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalData, setPinModalData] = useState({ lat: 0, lng: 0 });
  const { alert, showErrorAlert, closeAlert } = useAlert();
  const { loading, withLoading } = useLoading();

  useEffect(() => {
    initializeMap();
    loadPopulationData(); // 초기 로드만
  }, []);

  useEffect(() => {
    if (mapInstance.current && places.length > 0) {
      updateMarkers();
    }
  }, [places]);

  useEffect(() => {
    if (mapInstance.current && populationData.length > 0) {
      if (showCongestion) {
        updateCrowdPolygons();
        updateNoiseCircles();
      } else {
        // 혼잡도 오버레이 제거
        crowdPolygonsRef.current.forEach(polygon => polygon.setMap(null));
        crowdPolygonsRef.current = [];
        noiseCirclesRef.current.forEach(circle => circle.setMap(null));
        noiseCirclesRef.current = [];
      }
    }
  }, [populationData, showCongestion]);

  useEffect(() => {
    if (selectedSpot && mapInstance.current) {
      moveToSpot(selectedSpot);
      
      // 약간의 지연 후 InfoWindow 표시 (지도 이동 완료 후)
      setTimeout(() => {
        showInfoWindowForPlace(selectedSpot);
      }, 500);
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
      
      // 전역에서 접근 가능하도록 지도 인스턴스 노출
      (window as any).mapInstance = mapInstance.current;
      
      // Kakao Maps API 우클릭 이벤트
      (window as any).kakao.maps.event.addListener(mapInstance.current, 'rightclick', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        const lat = latlng.getLat();
        const lng = latlng.getLng();
        
        // 화면 좌표 계산 (메뉴 위치용)
        const rect = mapRef.current!.getBoundingClientRect();
        let screenX = rect.left + rect.width / 2;
        let screenY = rect.top + rect.height / 2;
        
        // 더 정확한 화면 좌표 계산
        try {
          const projection = mapInstance.current.getProjection();
          const mapCenter = mapInstance.current.getCenter();
          const mapCenterPixel = projection.pointFromCoords(mapCenter);
          const clickPixel = projection.pointFromCoords(latlng);
          
          const offsetX = clickPixel.x - mapCenterPixel.x;
          const offsetY = clickPixel.y - mapCenterPixel.y;
          
          screenX = rect.left + rect.width / 2 + offsetX;
          screenY = rect.top + rect.height / 2 + offsetY;
        } catch (error) {
          console.error('화면 좌표 계산 실패:', error);
        }
        
        setContextMenu({
          visible: true,
          x: screenX,
          y: screenY,
          lat,
          lng
        });
      });
      
      // 브라우저 기본 우클릭 메뉴 차단
      mapRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
      });
      
      // 지도 클릭 이벤트로 InfoWindow 닫기
      (window as any).kakao.maps.event.addListener(mapInstance.current, 'click', () => {
        // InfoWindow 닫기
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
          infoWindowRef.current = null;
        }
      });
    }
  };

  const loadPopulationData = async () => {
    try {
      const response = await withLoading(
        () => api.population.getRealtimePopulation(),
        { message: '실시간 인구밀도 데이터 로딩 중...', showLoading: true }
      );
      
      let populationArray = [];
      if (response && (response as any).data && Array.isArray((response as any).data)) {
        populationArray = (response as any).data;
      } else if (response && Array.isArray(response)) {
        populationArray = response;
      }
      
      setPopulationData(populationArray);
      
    } catch (error) {
      console.error('실시간 인구밀도 데이터 로드 실패:', error);
      showErrorAlert('실시간 인구밀도 API 연결에 실패했습니다.');
      setPopulationData([]);
    }
  };

  const createMarkerIcon = (category: string) => {
    // 카테고리별 이모지 및 밝고 귀여운 색상 설정
    const categoryConfig = {
      '카페': { emoji: '☕', color: '#FF6B9D' },    // 핑크
      '도서관': { emoji: '📚', color: '#4ECDC4' },  // 민트
      '공원': { emoji: '🌳', color: '#45B7D1' },    // 하늘색
      '기타': { emoji: '📍', color: '#96CEB4' }     // 연두색
    };

    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig['기타'];
    
    // 더 큰 SVG 마커 생성 (60x75px)
    const svgContent = `
      <svg width="60" height="75" viewBox="0 0 60 75" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <path d="M30 5C16.193 5 5 16.193 5 30c0 22.5 25 40 25 40s25-17.5 25-40C55 16.193 43.807 5 30 5z" 
              fill="${config.color}" 
              stroke="white" 
              stroke-width="3"
              filter="url(#shadow)"/>
        <circle cx="30" cy="30" r="18" fill="white" opacity="0.9"/>
        <text x="30" y="38" text-anchor="middle" font-size="24" fill="${config.color}">${config.emoji}</text>
      </svg>
    `;

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new (window as any).kakao.maps.MarkerImage(
      svgUrl,
      new (window as any).kakao.maps.Size(60, 75),
      {
        offset: new (window as any).kakao.maps.Point(30, 75)
      }
    );
  };

  const showInfoWindow = (marker: any, place: Spot) => {
    // 기존 InfoWindow 닫기
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    // InfoWindow 내용 생성
    const content = `
      <div style="
        padding: 16px;
        min-width: 280px;
        max-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.4;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        ">
          <h3 style="
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #333;
            flex: 1;
            padding-right: 8px;
          ">${place.name}</h3>
          <button onclick="closeInfoWindow()" style="
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">✕</button>
        </div>
        
        <div style="
          display: inline-block;
          background: ${place.quiet_rating >= 80 ? '#4CAF50' : place.quiet_rating >= 60 ? '#FF9800' : '#F44336'};
          color: white;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
        ">
          ${place.quiet_rating >= 80 ? '🤫' : place.quiet_rating >= 60 ? '😐' : '😰'} ${place.quiet_rating}점
        </div>
        
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
        ">
          <div>
            <span style="color: #666;">👍 좋아요</span>
            <span style="font-weight: 500; margin-left: 4px;">${place.like_count || 0}</span>
          </div>
          <div>
            <span style="color: #666;">👎 싫어요</span>
            <span style="font-weight: 500; margin-left: 4px;">${place.dislike_count || 0}</span>
          </div>
          <div>
            <span style="color: #666;">🔊 소음도</span>
            <span style="font-weight: 500; margin-left: 4px;">${place.noise_level}dB</span>
          </div>
          <div>
            <span style="color: #666;">⭐ 평점</span>
            <span style="font-weight: 500; margin-left: 4px;">${place.rating}/5</span>
          </div>
        </div>
        
        ${place.description ? `
          <div style="
            font-size: 14px;
            color: #666;
            line-height: 1.5;
            border-top: 1px solid #eee;
            padding-top: 12px;
          ">
            ${place.description}
          </div>
        ` : ''}
      </div>
    `;

    // InfoWindow 생성
    infoWindowRef.current = new (window as any).kakao.maps.InfoWindow({
      content: content,
      removable: false
    });

    // InfoWindow 표시
    infoWindowRef.current.open(mapInstance.current, marker);

    // 전역 함수로 닫기 기능 제공
    (window as any).closeInfoWindow = () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  };

  const showInfoWindowForPlace = (place: Spot) => {
    // 해당 장소의 마커 찾기
    const markerIndex = markersPlacesRef.current.findIndex(p => p.id === place.id);
    
    if (markerIndex !== -1 && markersRef.current[markerIndex]) {
      const targetMarker = markersRef.current[markerIndex];
      // InfoWindow 표시
      showInfoWindow(targetMarker, place);
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

  const getCrowdColor = (crowdLevel: number) => {
    // 자연스러운 색연필 색감
    if (crowdLevel >= 80) return '#FF6B6B';      // 연한 빨간색
    if (crowdLevel >= 60) return '#FFB347';      // 연한 주황색
    if (crowdLevel >= 40) return '#FFE66D';      // 연한 노란색
    if (crowdLevel >= 20) return '#95E1D3';      // 연한 민트색
    return '#A8E6CF';                            // 연한 녹색
  };

  const getNoiseColor = (noiseLevel: number) => {
    // 소음레벨용 자연스러운 색감
    if (noiseLevel >= 70) return '#FF8A95';      // 연한 분홍색
    if (noiseLevel >= 50) return '#FECA57';      // 연한 황금색
    if (noiseLevel >= 30) return '#48CAE4';      // 연한 하늘색
    return '#B8E6B8';                            // 연한 연두색
  };

  const createNaturalCircles = (latitude: number, longitude: number, color: string, intensity: number): any[] => {
    const circles: any[] = [];
    const center = new (window as any).kakao.maps.LatLng(latitude, longitude);
    
    // 다중 원형으로 자연스러운 그라데이션 효과 생성
    const layers = [
      { radius: 100, opacity: Math.min(0.6, intensity / 100 * 0.6) },
      { radius: 200, opacity: Math.min(0.4, intensity / 100 * 0.4) },
      { radius: 300, opacity: Math.min(0.2, intensity / 100 * 0.2) },
      { radius: 400, opacity: Math.min(0.1, intensity / 100 * 0.1) }
    ];
    
    layers.forEach(layer => {
      const circle = new (window as any).kakao.maps.Circle({
        center: center,
        radius: layer.radius,
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: layer.opacity
      });
      
      circle.setMap(mapInstance.current);
      circles.push(circle);
    });
    
    return circles;
  };

  const updateCrowdPolygons = () => {
    // 기존 폴리곤 제거
    crowdPolygonsRef.current.forEach(polygon => polygon.setMap(null));
    crowdPolygonsRef.current = [];

    if (!mapInstance.current || !populationData.length) return;

    populationData.forEach((data: any) => {
      const latitude = data.lat;
      const longitude = data.lng;
      
      if (!latitude || !longitude) {
        console.warn('위도/경도 정보가 없습니다:', data);
        return;
      }

      const crowdLevel = data.crowdLevel || data.crowd_level || 50;
      const color = getCrowdColor(crowdLevel);
      
      // 호버용 투명 원형 영역
      const hoverCircle = new (window as any).kakao.maps.Circle({
        center: new (window as any).kakao.maps.LatLng(latitude, longitude),
        radius: 400,
        strokeWeight: 0,
        fillColor: 'transparent',
        fillOpacity: 0
      });

      hoverCircle.setMap(mapInstance.current);

      // 호버 이벤트
      (window as any).kakao.maps.event.addListener(hoverCircle, 'mouseover', () => {
        const content = `
          <div style="padding: 12px; font-size: 14px; background: white; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); border: 1px solid #ddd; max-width: 220px;">
            <strong style="color: #333;">📍 ${data.name || '위치정보'}</strong><br>
            <strong style="color: #333;">🚶 유동인구: ${data.population?.toLocaleString() || '정보없음'}명</strong><br>
            <strong style="color: #666;">📊 혼잡도: ${crowdLevel}%</strong><br>
            <div style="margin-top: 8px; padding: 4px 8px; background: ${color}20; border-radius: 4px; font-size: 12px;">
              ${crowdLevel >= 80 ? '🔴 매우 혼잡' : crowdLevel >= 60 ? '🟠 혼잡' : crowdLevel >= 40 ? '🟡 보통' : crowdLevel >= 20 ? '🟢 여유' : '🔵 한적'}
            </div>
          </div>
        `;
        
        const tempInfoWindow = new (window as any).kakao.maps.InfoWindow({
          content: content,
          removable: false
        });
        
        tempInfoWindow.open(mapInstance.current, new (window as any).kakao.maps.LatLng(latitude, longitude));
        
        (window as any).kakao.maps.event.addListener(hoverCircle, 'mouseout', () => {
          tempInfoWindow.close();
        });
      });

      crowdPolygonsRef.current.push(hoverCircle);
    });
  };

  const updateNoiseCircles = () => {
    // 기존 원형 제거
    noiseCirclesRef.current.forEach(circle => circle.setMap(null));
    noiseCirclesRef.current = [];

    if (!mapInstance.current || !populationData.length) return;

    populationData.forEach((data: any) => {
      const latitude = data.lat;
      const longitude = data.lng;
      
      if (!latitude || !longitude) {
        console.warn('위도/경도 정보가 없습니다:', data);
        return;
      }

      const noiseLevel = data.noiseLevel || data.noise_level || 40;
      const color = getNoiseColor(noiseLevel);
      
      // 소음레벨을 작은 다중 원형으로 표시
      const circles = createNaturalCircles(latitude, longitude, color, noiseLevel);
      
      // 소음레벨은 더 작은 크기로 조정
      circles.forEach((circle, index) => {
        const smallRadius = [60, 120, 180, 240][index]; // 더 작은 반경
        circle.setRadius(smallRadius);
      });
      
      circles.forEach(circle => noiseCirclesRef.current.push(circle));
    });
  };

  const updateMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    markersPlacesRef.current = [];

    places.forEach(place => {
      const position = new (window as any).kakao.maps.LatLng(place.lat, place.lng);
      const markerIcon = createMarkerIcon(place.category || '기타');
      
      const marker = new (window as any).kakao.maps.Marker({
        position,
        map: mapInstance.current,
        image: markerIcon
      });

      (window as any).kakao.maps.event.addListener(marker, 'click', () => {
        // InfoWindow 표시
        showInfoWindow(marker, place);
        
        // 지도 중심을 해당 위치로 이동
        moveToSpot(place);
        
        // 외부 콜백 호출
        onPlaceClick?.(place);
      });

      markersRef.current.push(marker);
      markersPlacesRef.current.push(place);
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
      window.alert('위치 서비스를 지원하지 않는 브라우저입니다.');
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
        window.alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
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
        window.alert(`출발지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
      case 'waypoint':
        window.alert(`경유지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
      case 'destination':
        window.alert(`도착지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
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
      
      window.alert(`"${data.name}" 장소가 성공적으로 등록되었습니다!`);
      
      // 스팟 목록 새로고침
      if (onSpotsUpdate) {
        onSpotsUpdate();
      }
      
    } catch (error) {
      console.error('스팟 등록 실패:', error);
      window.alert('스팟 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
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

      {/* Toggle Button */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
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

      <PinRegistrationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        lat={pinModalData.lat}
        lng={pinModalData.lng}
        onSubmit={handlePinRegistration}
      />
      
      <Alert
        type={alert.type}
        message={alert.message}
        isOpen={alert.isOpen}
        onClose={closeAlert}
        autoClose={alert.autoClose}
      />
      
      <Loading
        isOpen={loading.isOpen}
        message={loading.message}
      />
      
      {/* Congestion Overlay */}
      {showCongestion && populationData.length > 0 && (
        <PlacePopulation 
          map={mapInstance.current} 
          congestionData={populationData.map(data => ({
            lat: data.lat,
            lng: data.lng,
            population: data.population,
            noiseLevel: data.noiseLevel,
            crowdLevel: data.crowdLevel,
            address: `${data.category || ''} - ${data.name}`,
            name: data.name
          }))}
        />
      )}
    </div>
  );
};

export default Map;
