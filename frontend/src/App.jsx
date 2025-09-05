import { useState, useEffect } from 'react';
import Map from './components/Map';
import PlaceList from './components/PlaceList';
import LoadingScreen from './components/LoadingScreen';
import { fetchPlaces } from './services/api';
import { loadKakaoMapScript } from './config/kakao';

function App() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // 카카오 지도 API 로드
    loadKakaoMapScript()
      .then(() => {
        setMapReady(true);
        loadPlaces();
      })
      .catch(error => {
        console.error('카카오 지도 API 로드 실패:', error);
        setLoading(false);
      });

    // Refresh data every 30 seconds for demo
    const interval = setInterval(loadPlaces, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPlaces = async () => {
    try {
      const data = await fetchPlaces();
      setPlaces(data);
    } catch (error) {
      console.error('Failed to load places:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceClick = (place) => {
    console.log('Selected place:', place);
  };

  if (loading || !mapReady) {
    const message = !mapReady ? '지도 API 로딩 중...' : '데이터 로딩 중...';
    return <LoadingScreen message={message} />;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🤫 쉿플레이스</h1>
        <p>조용하고 한적한 곳을 찾아보세요</p>
      </header>
      
      <main className="main-content">
        <aside className="sidebar">
          <PlaceList places={places} onPlaceClick={handlePlaceClick} />
        </aside>
        
        <div className="map-container">
          <Map places={places} onPlaceClick={handlePlaceClick} />
        </div>
      </main>
    </div>
  );
}

export default App;
