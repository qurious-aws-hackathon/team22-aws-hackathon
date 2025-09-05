import { useEffect, useRef, useState } from 'react';
import { getScoreText, getScoreColor, getScoreEmoji } from '../services/api';

const Map = ({ places, onPlaceClick }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef([]);
  const circles = useRef([]);
  const currentInfoWindow = useRef(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap');

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="
            width: 100%; 
            height: 100%; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
            font-size: 1.2rem;
          ">
            <div>
              <h3>🗺️지도 로딩 중...</h3>
              <p>카카오 지도 API를 불러오고 있습니다</p>
            </div>
          </div>
        `;
      }
      return;
    }

    const container = mapRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(37.5665, 126.9780),
      level: 7
    };

    mapInstance.current = new window.kakao.maps.Map(container, options);
  }, []);

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
        map: mapInstance.current
      });

      window.kakao.maps.event.addListener(circle, 'click', () => {
        setSelectedArea(place);
        onPlaceClick?.(place);
      });

      circles.current.push(circle);
    });
  };

  const createMarkerView = () => {
    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      
      // 커스텀 오버레이로 푸딘코 스타일 핀 생성
      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: createCustomMarkerContent(place),
        yAnchor: 1,
        clickable: true
      });

      customOverlay.setMap(mapInstance.current);

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: createInfoWindowContent(place),
        zIndex: 1000
      });

      // 커스텀 오버레이 클릭 이벤트
      const overlayElement = customOverlay.getContent();
      overlayElement.addEventListener('click', () => {
        if (currentInfoWindow.current) {
          currentInfoWindow.current.close();
        }
        
        infoWindow.open(mapInstance.current, customOverlay);
        currentInfoWindow.current = infoWindow;
        
        setSelectedArea(place);
        onPlaceClick?.(place);
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
