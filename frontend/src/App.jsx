import { useState, useEffect, useMemo, useCallback } from 'react';
import Map from './components/Map';
import PlaceList from './components/PlaceList';
import LoadingScreen from './components/LoadingScreen';
import { fetchPlaces, getScoreColor, getScoreText, getScoreEmoji } from './services/api';

function App() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // 거리 계산 함수 (Haversine formula) - useCallback으로 메모이제이션
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // 거리 기반 장소 필터링 - useCallback으로 메모이제이션
  const filterPlacesByDistance = useCallback((places, userPos, maxDistance) => {
    return places.filter(place => {
      const distance = calculateDistance(
        userPos.lat, userPos.lng,
        place.lat, place.lng
      );
      return distance <= maxDistance;
    }).sort((a, b) => {
      // 거리순으로 정렬
      const distA = calculateDistance(userPos.lat, userPos.lng, a.lat, a.lng);
      const distB = calculateDistance(userPos.lat, userPos.lng, b.lat, b.lng);
      return distA - distB;
    });
  }, [calculateDistance]);

  const loadPlaces = useCallback(async (location = null) => {
    try {
      const data = await fetchPlaces(location);
      setPlaces(data);
    } catch (error) {
      console.error('Failed to load places:', error);
    } finally {
      // 최소 0.5초 로딩 화면 표시
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, []);

  useEffect(() => {
    // HTML에서 이미 카카오 지도 API를 로드했으므로 바로 데이터 로드
    setMapReady(true);
    loadPlaces();
  }, [loadPlaces]);

  // 사용자 위치가 변경될 때 주변 데이터 필터링 (useMemo로 최적화)
  const filteredPlaces = useMemo(() => {
    if (!userLocation || places.length === 0) {
      return places;
    }
    
    const nearbyPlaces = filterPlacesByDistance(places, userLocation, 10); // 10km 반경으로 확대
    // 로그 빈도 줄이기 - 5초마다만 출력
    if (!window.lastLogTime || Date.now() - window.lastLogTime > 5000) {
      console.log(`${nearbyPlaces.length}개의 주변 장소를 찾았습니다.`);
      window.lastLogTime = Date.now();
    }
    return nearbyPlaces;
  }, [userLocation, places, filterPlacesByDistance]);

  const handlePlaceClick = useCallback((place) => {
    setSelectedPlace(place);
  }, []);

  const handleLocationChange = useCallback((location) => {
    setUserLocation(location);
    // 위치 변경시 해당 위치 기준으로 데이터 다시 로드
    loadPlaces(location);
  }, [loadPlaces]);

  const getRecommendation = useCallback((score) => {
    if (score >= 80) return '매우 조용한 힐링 공간입니다';
    if (score >= 60) return '산책하기 좋은 조용한 곳입니다';
    if (score >= 40) return '적당한 활기가 있는 곳입니다';
    if (score >= 20) return '사람이 많고 활기찬 곳입니다';
    return '매우 붐비는 번화가입니다';
  }, []);

  if (loading || !mapReady) {
    const message = !mapReady ? '지도 API 로딩 중...' : '데이터 로딩 중...';
    return <LoadingScreen message={message} />;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🤫 쉿플레이스</h1>
        <p>조용하고 한적한 곳을 찾아보세요</p>
        {userLocation && (
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            📍 현재 위치 기준 3km 반경 내 {filteredPlaces.length}개 장소
          </p>
        )}
      </header>
      
      <main className="main-content">
        <aside className="sidebar">
          <PlaceList places={filteredPlaces} onPlaceClick={handlePlaceClick} />
        </aside>
        
        <div className="map-container">
          <Map 
            places={filteredPlaces} 
            onPlaceClick={handlePlaceClick}
            onLocationChange={handleLocationChange}
          />
          
          {/* 선택된 장소 상세 정보 패널 */}
          {selectedPlace && (
            <div className="place-detail-panel">
              <div className="place-detail-header">
                <h3>{selectedPlace.name}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedPlace(null)}
                >
                  ✕
                </button>
              </div>
              
              <div className="place-detail-content">
                <div className="score-section">
                  <div className="score-badge" style={{
                    backgroundColor: getScoreColor(selectedPlace.quietScore)
                  }}>
                    {getScoreEmoji(selectedPlace.quietScore)} {selectedPlace.quietScore}점
                  </div>
                  <p className="score-text">{getScoreText(selectedPlace.quietScore)}</p>
                </div>
                
                <div className="info-grid">
                  {selectedPlace.population && (
                    <div className="info-item">
                      <span className="info-label">👥 인구밀도</span>
                      <span className="info-value">{selectedPlace.population.toLocaleString()}명</span>
                    </div>
                  )}
                  
                  {userLocation && (
                    <div className="info-item">
                      <span className="info-label">📏 거리</span>
                      <span className="info-value">
                        {calculateDistance(
                          userLocation.lat, userLocation.lng,
                          selectedPlace.lat, selectedPlace.lng
                        ).toFixed(1)}km
                      </span>
                    </div>
                  )}
                  
                  <div className="info-item">
                    <span className="info-label">🔊 소음도</span>
                    <span className="info-value">{['낮음', '보통', '높음'][selectedPlace.noiseLevel]}</span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">🚶 혼잡도</span>
                    <span className="info-value">{['낮음', '보통', '높음'][selectedPlace.crowdLevel]}</span>
                  </div>
                </div>
                
                <div className="recommendation">
                  <h4>💡 추천 이유</h4>
                  <p>{getRecommendation(selectedPlace.quietScore)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
