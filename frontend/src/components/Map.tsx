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
  const markersPlacesRef = useRef<Spot[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const crowdPolygonsRef = useRef<any[]>([]);
  const noiseCirclesRef = useRef<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [populationData, setPopulationData] = useState<any[]>([]);
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
    loadPopulationData(); // 인구밀도 데이터 로드
  }, []);

  useEffect(() => {
    if (mapInstance.current && places.length > 0) {
      updateMarkers();
    }
  }, [places]);

  useEffect(() => {
    if (mapInstance.current && populationData.length > 0) {
      updateCrowdPolygons();
      updateNoiseCircles();
    }
  }, [populationData]);

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
      
      // 지도 클릭 이벤트로 좌표 정확도 테스트 및 InfoWindow 닫기
      (window as any).kakao.maps.event.addListener(mapInstance.current, 'click', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        console.log('일반 클릭 좌표 (참고용):', latlng.getLat(), latlng.getLng());
        
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
      console.log('인구밀도 데이터 로드 시작');
      const response = await api.population.getPopulation();
      
      console.log('API 응답 전체:', response);
      console.log('응답 타입:', typeof response);
      console.log('응답 길이:', response?.length);
      
      if (response && response.length > 0) {
        console.log('첫 번째 데이터 샘플:', response[0]);
        console.log('데이터 필드들:', Object.keys(response[0]));
        setPopulationData(response);
      } else {
        console.log('API 데이터가 없어 더미 데이터 사용');
        // 실제 PlacePopulation 모델 구조에 맞는 더미 데이터
        const dummyData = [
          { 
            place_id: 'test1', 
            lat: 37.5665, 
            lng: 126.9780, 
            population: 850, 
            crowdLevel: 75, 
            noiseLevel: 55,
            name: '서울시청 앞'
          },
          { 
            place_id: 'test2', 
            lat: 37.5675, 
            lng: 126.9790, 
            population: 420, 
            crowdLevel: 45, 
            noiseLevel: 35,
            name: '덕수궁 근처'
          },
          { 
            place_id: 'test3', 
            lat: 37.5655, 
            lng: 126.9770, 
            population: 1200, 
            crowdLevel: 90, 
            noiseLevel: 65,
            name: '명동 입구'
          }
        ];
        console.log('더미 데이터 사용:', dummyData);
        setPopulationData(dummyData);
      }
    } catch (error) {
      console.error('인구밀도 데이터 로드 실패:', error);
      // 에러 시에도 더미 데이터 사용
      const dummyData = [
        { 
          place_id: 'error1', 
          lat: 37.5665, 
          lng: 126.9780, 
          population: 850, 
          crowdLevel: 75, 
          noiseLevel: 55,
          name: '서울시청 (에러시)'
        }
      ];
      setPopulationData(dummyData);
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
    if (crowdLevel >= 80) return 'rgba(255, 0, 0, 0.7)';      // 빨간색 (매우 혼잡)
    if (crowdLevel >= 60) return 'rgba(255, 165, 0, 0.7)';    // 주황색 (혼잡)
    if (crowdLevel >= 40) return 'rgba(255, 255, 0, 0.7)';    // 노란색 (보통)
    if (crowdLevel >= 20) return 'rgba(0, 255, 0, 0.7)';      // 녹색 (여유)
    return 'rgba(0, 0, 255, 0.7)';                            // 파란색 (한적)
  };

  const getNoiseColor = (noiseLevel: number) => {
    if (noiseLevel >= 70) return 'rgba(255, 0, 0, 0.8)';      // 빨간색 (매우 시끄러움)
    if (noiseLevel >= 50) return 'rgba(255, 165, 0, 0.8)';    // 주황색 (시끄러움)
    if (noiseLevel >= 30) return 'rgba(255, 255, 0, 0.8)';    // 노란색 (보통)
    return 'rgba(0, 255, 0, 0.8)';                            // 녹색 (조용함)
  };

  const updateCrowdPolygons = () => {
    // 기존 폴리곤 제거
    crowdPolygonsRef.current.forEach(polygon => polygon.setMap(null));
    crowdPolygonsRef.current = [];

    if (!mapInstance.current || !populationData.length) return;

    populationData.forEach((data: any) => {
      // PlacePopulation 모델의 올바른 필드명 사용
      const latitude = data.lat || data.latitude;
      const longitude = data.lng || data.longitude;
      
      if (!latitude || !longitude) {
        console.warn('위도/경도 정보가 없습니다:', data);
        return;
      }

      // 혼잡도 영역을 큰 사각형으로 표시 - 중심이 latitude, longitude가 되도록
      const offset = 0.005; // 0.005도 = 약 500m (중심에서 각 방향으로)
      const bounds = [
        new (window as any).kakao.maps.LatLng(latitude + offset, longitude - offset), // 좌상
        new (window as any).kakao.maps.LatLng(latitude + offset, longitude + offset), // 우상
        new (window as any).kakao.maps.LatLng(latitude - offset, longitude + offset), // 우하
        new (window as any).kakao.maps.LatLng(latitude - offset, longitude - offset)  // 좌하
      ];

      const polygon = new (window as any).kakao.maps.Polygon({
        path: bounds,
        strokeWeight: 3,
        strokeColor: getCrowdColor(data.crowdLevel || data.crowd_level || 50).replace('0.7', '1'),
        strokeOpacity: 1,
        fillColor: getCrowdColor(data.crowdLevel || data.crowd_level || 50),
        fillOpacity: 0.7
      });

      polygon.setMap(mapInstance.current);

      // 호버 이벤트 추가
      (window as any).kakao.maps.event.addListener(polygon, 'mouseover', () => {
        const content = `
          <div style="padding: 12px; font-size: 14px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #333;">
            <strong style="color: #333;">🚶 유동인구: ${data.population || '정보없음'}명</strong><br>
            <strong style="color: #666;">📊 혼잡도: ${data.crowdLevel || data.crowd_level || 0}%</strong><br>
            <small style="color: #999;">📍 ${data.name || '위치정보'}</small>
          </div>
        `;
        
        const tempInfoWindow = new (window as any).kakao.maps.InfoWindow({
          content: content,
          removable: false
        });
        
        // 정확히 중심점에 InfoWindow 표시
        tempInfoWindow.open(mapInstance.current, new (window as any).kakao.maps.LatLng(latitude, longitude));
        
        // 마우스 아웃 시 제거
        (window as any).kakao.maps.event.addListener(polygon, 'mouseout', () => {
          tempInfoWindow.close();
        });
      });

      crowdPolygonsRef.current.push(polygon);
    });

    console.log('혼잡도 폴리곤 생성 완료:', crowdPolygonsRef.current.length);
  };

  const updateNoiseCircles = () => {
    // 기존 원형 제거
    noiseCirclesRef.current.forEach(circle => circle.setMap(null));
    noiseCirclesRef.current = [];

    if (!mapInstance.current || !populationData.length) return;

    populationData.forEach((data: any) => {
      // PlacePopulation 모델의 올바른 필드명 사용
      const latitude = data.lat || data.latitude;
      const longitude = data.lng || data.longitude;
      
      if (!latitude || !longitude) {
        console.warn('위도/경도 정보가 없습니다:', data);
        return;
      }

      const circle = new (window as any).kakao.maps.Circle({
        center: new (window as any).kakao.maps.LatLng(latitude, longitude), // 정확히 중심에 위치
        radius: 300, // 300m 반경
        strokeWeight: 4,
        strokeColor: getNoiseColor(data.noiseLevel || data.noise_level || 40).replace('0.8', '1'),
        strokeOpacity: 1,
        fillColor: getNoiseColor(data.noiseLevel || data.noise_level || 40),
        fillOpacity: 0.5
      });

      circle.setMap(mapInstance.current);
      noiseCirclesRef.current.push(circle);
    });

    console.log('소음레벨 원형 생성 완료:', noiseCirclesRef.current.length);
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
        console.log('핀 클릭:', place.name);
        
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
