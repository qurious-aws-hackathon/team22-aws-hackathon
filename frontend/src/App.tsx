import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import MainLayout from './components/MainLayout';
import Map from './components/Map';
import FloatingPlaceList from './components/FloatingPlaceList';
import PlaceDetailPanel from './components/PlaceDetailPanel';
import LoadingScreen from './components/LoadingScreen';
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

  const handleCloseDetail = () => {
    setSelectedSpot(null);
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
        
        {selectedSpot && (
          <PlaceDetailPanel 
            spot={selectedSpot} 
            onClose={handleCloseDetail} 
          />
        )}
      </MainLayout>
    </div>
  );
}

export default App;
