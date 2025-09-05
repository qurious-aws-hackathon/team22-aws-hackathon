import { useEffect, useRef, useState } from 'react';
import { getScoreText, getScoreColor, getScoreEmoji } from '../services/api';

const Map = ({ places, onPlaceClick, onLocationChange }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef([]);
  const circles = useRef([]);
  const currentInfoWindow = useRef(null);
  const userMarker = useRef(null); // 사용자 마커 참조 추가
  const [selectedArea, setSelectedArea] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap');
  const [userLocation, setUserLocation] = useState(null);

  // 카카오 지도 API 동적 로드
  const loadKakaoMapAPI = () => {
    return new Promise((resolve, reject) => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=9aad82b3e0f110046a739e949ebbd947&autoload=false';
      script.onload = () => {
        window.kakao.maps.load(() => {
          // API 완전 로드 확인
          if (window.kakao.maps.LatLng && window.kakao.maps.Map) {
            resolve();
          } else {
            reject(new Error('카카오맵 API 로드 실패'));
          }
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    // 사용자 위치를 먼저 가져온 후 지도 초기화
    const initMap = async () => {
      try {
        await loadKakaoMapAPI();
        
        // 사용자 실제 위치 가져오기 (고정밀도)
        const getUserLocation = () => {
          return new Promise((resolve) => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log('실제 위치:', position.coords.latitude, position.coords.longitude);
                  resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  });
                },
                (error) => {
                  console.log('위치 권한 거부 또는 오류:', error);
                  // 위치 권한 거부시 서울시청으로 기본 설정
                  resolve({ lat: 37.5665, lng: 126.9780 });
                },
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0
                }
              );
            } else {
              console.log('Geolocation 미지원');
              resolve({ lat: 37.5665, lng: 126.9780 });
            }
          });
        };

        const location = await getUserLocation();
        
        // 카카오맵 API 완전 로드 확인
        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.LatLng) {
          throw new Error('카카오맵 API가 완전히 로드되지 않았습니다');
        }
        
        const options = {
          center: new window.kakao.maps.LatLng(location.lat, location.lng),
          level: 4,  // 초기 레벨
          draggable: true,
          scrollwheel: true,  // 마우스 휠 줌 활성화
          disableDoubleClick: false,  // 더블클릭 줌 활성화
          disableDoubleClickZoom: false
        };
        
        mapInstance.current = new window.kakao.maps.Map(mapRef.current, options);
        
        // 지도 중앙에 내 위치 확실히 설정
        setTimeout(() => {
          mapInstance.current.setCenter(new window.kakao.maps.LatLng(location.lat, location.lng));
        }, 100);
        
        // 사용자 위치에 마커 추가
        if (window.kakao.maps.Marker && window.kakao.maps.MarkerImage) {
          userMarker.current = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(location.lat, location.lng),
            map: mapInstance.current,
            image: new window.kakao.maps.MarkerImage(
              'data:image/svg+xml;base64,' + btoa(`
                <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 50C20 50 35 30 35 20C35 11.7157 28.2843 5 20 5C11.7157 5 5 11.7157 5 20C5 30 20 50 20 50Z" fill="#4285F4" stroke="white" stroke-width="2"/>
                  <circle cx="20" cy="20" r="8" fill="white"/>
                  <circle cx="20" cy="20" r="4" fill="#4285F4"/>
                </svg>
              `),
              new window.kakao.maps.Size(40, 50),
              { offset: new window.kakao.maps.Point(20, 50) }
            )
          });
        }
        
        // 위치 정보를 부모 컴포넌트에 전달
        setUserLocation(location);
        
        if (onLocationChange) {
          onLocationChange(location);
        }
        
      } catch (error) {
        console.error('지도 초기화 실패:', error);
      }
    };

    initMap();
  }, [onLocationChange]);

  useEffect(() => {
    if (!mapInstance.current || !places.length) return;

    // Clear existing markers and circles
    markers.current.forEach(marker => marker.setMap(null));
    circles.current.forEach(circle => circle.setMap(null));
    
    if (currentInfoWindow.current) {
      currentInfoWindow.current.close();
      currentInfoWindow.current = null;
    }
    
    markers.current = [];
    circles.current = [];

    if (viewMode === 'heatmap') {
      createHeatmapView();
    } else {
      createMarkerView();
    }
  }, [places, onPlaceClick, viewMode]);

  const createCustomMarkerContent = (place) => {
    const color = getScoreColor(place.quietScore);
    const emoji = getScoreEmoji(place.quietScore);
    
    return `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transform: translate(-50%, -100%);
      ">
        <!-- 푸딘코 스타일 핀 -->
        <div style="
          background: ${color};
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 3px solid white;
          min-width: 60px;
          text-align: center;
          position: relative;
          z-index: 10;
        ">
          <div style="font-size: 14px; margin-bottom: 2px;">${emoji}</div>
          <div>${place.quietScore}점</div>
        </div>
        
        <!-- 핀 꼬리 -->
        <div style="
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 12px solid ${color};
          margin-top: -3px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        "></div>
        
        <!-- 그림자 -->
        <div style="
          width: 20px;
          height: 8px;
          background: rgba(0,0,0,0.2);
          border-radius: 50%;
          margin-top: 2px;
          filter: blur(2px);
        "></div>
      </div>
    `;
  };

  const createHeatmapView = () => {
    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      
      const { color, opacity, radius } = getHeatmapStyleByScore(place.quietScore, place.population);
      
      const circle = new window.kakao.maps.Circle({
        center: position,
        radius: radius,
        strokeWeight: 2,
        strokeColor: color,
        strokeOpacity: 0.8,
        fillColor: color,
        fillOpacity: opacity,
        map: mapInstance.current,
        clickable: true
      });

      window.kakao.maps.event.addListener(circle, 'click', (mouseEvent) => {
        mouseEvent.stop();
        setSelectedArea(place);
        onPlaceClick?.(place);
      });

      circles.current.push(circle);
    });
  };

  const createMarkerView = () => {
    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      
      // 클릭 가능한 마커 콘텐츠 생성
      const markerContent = document.createElement('div');
      markerContent.innerHTML = createCustomMarkerContent(place);
      markerContent.style.cursor = 'pointer';
      markerContent.style.pointerEvents = 'auto';
      
      // 커스텀 오버레이로 푸딘코 스타일 핀 생성
      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: markerContent,
        yAnchor: 1,
        clickable: true
      });

      customOverlay.setMap(mapInstance.current);

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: createInfoWindowContent(place),
        zIndex: 1000
      });

      // 마커 클릭 이벤트 - 이벤트 전파 방지
      markerContent.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (currentInfoWindow.current) {
          currentInfoWindow.current.close();
        }
        
        infoWindow.open(mapInstance.current, customOverlay);
        currentInfoWindow.current = infoWindow;
        
        setSelectedArea(place);
        onPlaceClick?.(place);
      });

      // 드래그 이벤트 방지
      markerContent.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });

      markerContent.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      });

      markers.current.push(customOverlay);
    });

    // 지도 클릭 시 팝업 닫기
    window.kakao.maps.event.addListener(mapInstance.current, 'click', () => {
      if (currentInfoWindow.current) {
        currentInfoWindow.current.close();
        currentInfoWindow.current = null;
        setSelectedArea(null);
      }
    });
  };

  const getHeatmapStyleByScore = (score, population = 0) => {
    const color = getScoreColor(score);
    let opacity = 0.4;
    let radius = Math.max(300, population / 20);
    
    if (score >= 80) {
      opacity = 0.3;
    } else if (score >= 60) {
      opacity = 0.4;
    } else if (score >= 40) {
      opacity = 0.5;
    } else {
      opacity = 0.6;
    }
    
    return { color, opacity, radius };
  };

  const createInfoWindowContent = (place) => {
    const recommendation = getRecommendation(place.quietScore);
    
    return `
      <div style="
        padding:15px; 
        min-width:220px; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        position: relative;
        z-index: 1001;
        background: white;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        border: none;
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h4 style="margin:0; color:#2c3e50; font-size: 1.2rem; flex: 1; font-weight: 600;">${place.name}</h4>
          <div style="
            background: ${getScoreColor(place.quietScore)};
            color: white;
            padding: 8px 12px;
            border-radius: 16px;
            font-size: 0.9rem;
            font-weight: bold;
            margin-left: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          ">
            ${getScoreEmoji(place.quietScore)} ${place.quietScore}점
          </div>
        </div>
        
        <div style="margin-bottom:12px;">
          <span style="
            background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
            color: #495057; 
            padding:6px 12px; 
            border-radius:8px; 
            font-size:0.9rem;
            font-weight: 500;
            border: 1px solid #dee2e6;
          ">
            ${getScoreText(place.quietScore)}
          </span>
        </div>
        
        ${place.population ? `<p style="margin:8px 0; font-size:0.95rem; color:#6c757d; display: flex; align-items: center;"><span style="margin-right: 6px;">👥</span> ${place.population.toLocaleString()}명</p>` : ''}
        <p style="margin:8px 0; font-size:0.95rem; color:#495057; font-weight: 500; display: flex; align-items: center;"><span style="margin-right: 6px;">📍</span> ${recommendation}</p>
        
        <div style="
          font-size:0.85rem; 
          color:#6c757d; 
          margin-top:12px; 
          padding-top: 12px; 
          border-top: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
        ">
          <span>소음: ${['낮음', '보통', '높음'][place.noiseLevel]}</span>
          <span>혼잡: ${['낮음', '보통', '높음'][place.crowdLevel]}</span>
        </div>
      </div>
    `;
  };

  const getRecommendation = (score) => {
    if (score >= 80) return '매우 조용한 힐링 공간입니다';
    if (score >= 60) return '산책하기 좋은 조용한 곳입니다';
    if (score >= 40) return '적당한 활기가 있는 곳입니다';
    if (score >= 20) return '사람이 많고 활기찬 곳입니다';
    return '매우 붐비는 번화가입니다';
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 뷰 모드 토글 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        borderRadius: '12px',
        padding: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #e9ecef'
      }}>
        <button
          onClick={() => setViewMode('heatmap')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            background: viewMode === 'heatmap' ? '#667eea' : 'transparent',
            color: viewMode === 'heatmap' ? 'white' : '#495057',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginRight: '4px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          🗺️ 히트맵
        </button>
        <button
          onClick={() => setViewMode('markers')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            background: viewMode === 'markers' ? '#667eea' : 'transparent',
            color: viewMode === 'markers' ? 'white' : '#495057',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          📍 핀
        </button>
      </div>

      {/* 내 위치로 이동 버튼 */}
      <div style={{
        position: 'absolute',
        top: '70px',
        right: '10px',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            if (navigator.geolocation && mapInstance.current) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log('🎯 버튼 - 새로운 위치:', position.coords.latitude, position.coords.longitude);
                  console.log('정확도:', position.coords.accuracy, 'm');
                  
                  const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  
                  try {
                    // 지도 중심 이동 + 고정 레벨로 설정
                    if (mapInstance.current && mapInstance.current.setCenter) {
                      mapInstance.current.setCenter(new window.kakao.maps.LatLng(newLocation.lat, newLocation.lng));
                      mapInstance.current.setLevel(4); // 🎯 버튼 클릭시에만 고정 레벨
                    }
                    
                    // 사용자 마커 위치 업데이트
                    if (userMarker.current && userMarker.current.setPosition) {
                      userMarker.current.setPosition(new window.kakao.maps.LatLng(newLocation.lat, newLocation.lng));
                    }
                    
                    setUserLocation(newLocation);
                    if (onLocationChange) {
                      onLocationChange(newLocation);
                    }
                  } catch (error) {
                    console.error('지도 업데이트 오류:', error);
                  }
                },
                (error) => {
                  console.error('위치 가져오기 실패:', error);
                  let errorMessage = '위치를 가져올 수 없습니다. ';
                  
                  switch(error.code) {
                    case error.PERMISSION_DENIED:
                      errorMessage += '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                      break;
                    case error.POSITION_UNAVAILABLE:
                      errorMessage += '위치 정보를 사용할 수 없습니다.';
                      break;
                    case error.TIMEOUT:
                      errorMessage += '위치 요청 시간이 초과되었습니다.';
                      break;
                    default:
                      errorMessage += '알 수 없는 오류가 발생했습니다.';
                      break;
                  }
                  
                  alert(errorMessage + '\n\n기본 위치(서울시청)로 이동합니다.');
                  
                  // 기본 위치로 이동
                  const defaultLocation = { lat: 37.5665, lng: 126.9780 };
                  if (mapInstance.current) {
                    mapInstance.current.setCenter(new window.kakao.maps.LatLng(defaultLocation.lat, defaultLocation.lng));
                    mapInstance.current.setLevel(4);
                  }
                  
                  if (userMarker.current) {
                    userMarker.current.setPosition(new window.kakao.maps.LatLng(defaultLocation.lat, defaultLocation.lng));
                  }
                  
                  setUserLocation(defaultLocation);
                  if (onLocationChange) {
                    onLocationChange(defaultLocation);
                  }
                },
                {
                  enableHighAccuracy: true,
                  timeout: 15000,
                  maximumAge: 0
                }
              );
            }
          }}
          style={{
            padding: '12px',
            border: 'none',
            borderRadius: '12px',
            background: 'white',
            color: '#495057',
            fontSize: '1.2rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e9ecef',
            transition: 'all 0.2s'
          }}
          title="내 위치로 이동"
        >
          🎯
        </button>
      </div>

      {/* 범례 */}
      {viewMode === 'heatmap' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '0.85rem',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>조용함 지수</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '14px', height: '14px', background: '#4CAF50', borderRadius: '50%', marginRight: '8px' }}></div>
            <span style={{ color: '#495057' }}>80~100점 (매우 조용함)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '14px', height: '14px', background: '#87CEEB', borderRadius: '50%', marginRight: '8px' }}></div>
            <span style={{ color: '#495057' }}>60~79점 (조용함)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '14px', height: '14px', background: '#90EE90', borderRadius: '50%', marginRight: '8px' }}></div>
            <span style={{ color: '#495057' }}>40~59점 (보통)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '14px', height: '14px', background: '#FF6B6B', borderRadius: '50%', marginRight: '8px' }}></div>
            <span style={{ color: '#495057' }}>0~39점 (시끄러움)</span>
          </div>
        </div>
      )}

      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Map;
