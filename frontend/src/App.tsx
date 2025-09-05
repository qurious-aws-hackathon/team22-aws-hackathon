import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import MainLayout from './components/MainLayout';
import Map from './components/Map';
import FloatingPlaceList from './components/FloatingPlaceList';
import LoadingScreen from './components/LoadingScreen';
import ChatBot from './components/ChatBot';
import { api, type Spot } from './api';
import './App.css';

function App() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  useEffect(() => {
    loadSpots();
  }, []);

  const loadSpots = async () => {
    try {
      const data = await api.spots.getSpots();
      setSpots(data);
    } catch (error) {
      console.error('Failed to load spots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotClick = (spot: Spot) => {
    setSelectedSpot(spot);
  };

  if (loading) {
    return <LoadingScreen message="데이터 로딩 중..." />;
  }

  return (
    <div className="app">
      <TopBar spotsCount={spots.length} />
      
      <MainLayout>
        <div className="map-wrapper">
          <Map 
            places={spots} 
            onPlaceClick={handleSpotClick}
            selectedSpot={selectedSpot}
            onSpotsUpdate={loadSpots}
          />
        </div>
        
        <FloatingPlaceList 
          places={spots} 
          onPlaceClick={handleSpotClick} 
        />
      </MainLayout>

      {/* ChatBot - Non-intrusive floating component */}
      <ChatBot />
    </div>
  );
}

export default App;
