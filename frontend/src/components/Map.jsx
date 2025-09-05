import { useEffect, useRef, useState } from 'react';

const Map = ({ places, onPlaceClick }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef([]);
  const circles = useRef([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' or 'markers'

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
    markers.current = [];
    circles.current = [];

    if (viewMode === 'heatmap') {
      createHeatmapView();
    } else {
      createMarkerView();
    }
  }, [places, onPlaceClick, viewMode]);

  const createHeatmapView = () => {
    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      
      // 혼잡도 + 소음도 기반 색상 결정
      const quietScore = calculateQuietScore(place);
      const { color, opacity, radius } = getHeatmapStyle(quietScore, place.population);
      
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

      // 클릭 이벤트
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
      
      const marker = new window.kakao.maps.Marker({
        position: position,
        map: mapInstance.current
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: createInfoWindowContent(place)
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infoWindow.open(mapInstance.current, marker);
        setSelectedArea(place);
        onPlaceClick?.(place);
      });

      markers.current.push(marker);
    });
  };

  const calculateQuietScore = (place) => {
    // 0: 매우 조용함, 1: 보통, 2: 시끄러움
    return (place.crowdLevel * 0.6 + place.noiseLevel * 0.4);
  };

  const getHeatmapStyle = (quietScore, population = 0) => {
    if (quietScore <= 0.7) {
      return { 
        color: '#87CEEB', // 하늘색 - 한적함
        opacity: 0.4,
        radius: Math.max(300, population / 20)
      };
    } else if (quietScore <= 1.3) {
      return { 
        color: '#90EE90', // 초록색 - 평균
        opacity: 0.5,
        radius: Math.max(400, population / 15)
      };
    } else {
      return { 
        color: '#FF6B6B', // 빨간색 - 붐빔
        opacity: 0.6,
        radius: Math.max(500, population / 10)
      };
    }
  };

  const createInfoWindowContent = (place) => {
    const quietScore = calculateQuietScore(place);
    const recommendation = getRecommendation(place, quietScore);
    
    return `
      <div style="padding:15px; min-width:200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h4 style="margin:0 0 10px 0; color:#2c3e50;">${place.name}</h4>
        <div style="margin-bottom:8px;">
          <span style="background:${getHeatmapStyle(quietScore).color}; color:white; padding:2px 6px; border-radius:3px; font-size:0.8rem;">
            ${quietScore <= 0.7 ? '🤫 조용함' : quietScore <= 1.3 ? '😐 보통' : '😵 시끄러움'}
          </span>
        </div>
        ${place.population ? `<p style="margin:5px 0; font-size:0.9rem;">👥 ${place.population.toLocaleString()}명</p>` : ''}
        <p style="margin:5px 0; font-size:0.9rem;">📍 ${recommendation}</p>
        <div style="font-size:0.8rem; color:#666; margin-top:8px;">
          소음: ${['낮음', '보통', '높음'][place.noiseLevel]} | 
          혼잡: ${['낮음', '보통', '높음'][place.crowdLevel]}
        </div>
      </div>
    `;
  };

  const getRecommendation = (place, quietScore) => {
    if (quietScore <= 0.7) {
      return '산책하기 좋은 조용한 곳입니다';
    } else if (quietScore <= 1.3) {
      return '적당한 활기가 있는 곳입니다';
    } else {
      return '사람이 많고 활기찬 곳입니다';
    }
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
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => setViewMode('heatmap')}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            background: viewMode === 'heatmap' ? '#667eea' : '#f0f0f0',
            color: viewMode === 'heatmap' ? 'white' : '#333',
            fontSize: '0.8rem',
            cursor: 'pointer',
            marginRight: '4px'
          }}
        >
          🗺️ 히트맵
        </button>
        <button
          onClick={() => setViewMode('markers')}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            background: viewMode === 'markers' ? '#667eea' : '#f0f0f0',
            color: viewMode === 'markers' ? 'white' : '#333',
            fontSize: '0.8rem',
            cursor: 'pointer'
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
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>혼잡도 범례</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: '#87CEEB', borderRadius: '50%', marginRight: '6px' }}></div>
            한적함 (산책 추천)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: '#90EE90', borderRadius: '50%', marginRight: '6px' }}></div>
            보통
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', background: '#FF6B6B', borderRadius: '50%', marginRight: '6px' }}></div>
            붐빔
          </div>
        </div>
      )}

      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Map;
