import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import MainLayout from './components/MainLayout';
import Map from './components/Map';
import FloatingPlaceList from './components/FloatingPlaceList';
import LoadingScreen from './components/LoadingScreen';
import LoginModal from './components/LoginModal';
import ChatBot from './components/ChatBot';
import LocationButton from './components/LocationButton';
import { LoadingProvider } from './contexts/LoadingContext';
import { api, type Spot } from './api';
import { authApi } from './api/auth';
import './App.css';

type AppState = 'landing' | 'loading' | 'ready';

function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // 사용자 위치 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('위치 정보를 가져올 수 없습니다:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    // 새로고침 시 로그인 상태 확인
    if (authApi.isLoggedIn()) {
      setAppState('loading');
      loadSpots();
    } else {
      setAppState('landing');
    }
  }, []);

  const loadSpots = async () => {
    try {
      setAppState('loading');
      const data = await api.spots.getSpots();
      setSpots(data);
      setAppState('ready');
    } catch (error) {
      console.error('Failed to load spots:', error);
      setAppState('ready'); // 에러가 있어도 지도는 보여주기
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setAppState('loading');
    loadSpots();
  };

  const handleLogout = () => {
    authApi.logout();
    setAppState('landing');
    setShowLoginModal(false);
    setSpots([]);
    setSelectedSpot(null);
  };

  const handleSpotClick = (spot: Spot) => {
    setSelectedSpot(spot);
  };

  const handleSpotDelete = (spotId: string) => {
    setSpots(prev => prev.filter(spot => spot.id !== spotId));
    if (selectedSpot?.id === spotId) {
      setSelectedSpot(null);
    }
  };

  // 랜딩 상태
  if (appState === 'landing') {
    return (
      <>
        <div style={{
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* 배경 장식 */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'float 20s ease-in-out infinite'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* 로고 */}
            <div style={{
              marginBottom: '2rem',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '6rem',
                marginBottom: '0.5rem',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                animation: 'bounce 2s ease-in-out infinite'
              }}>
                🤫
              </div>
              <h1 style={{ 
                fontSize: '3.5rem', 
                margin: 0,
                fontWeight: '800',
                background: 'linear-gradient(45deg, #fff, #f0f0f0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '-2px'
              }}>
                쉿플레이스
              </h1>
            </div>
            
            <p style={{ 
              fontSize: '1.3rem', 
              opacity: 0.9,
              marginBottom: '3rem',
              fontWeight: '300',
              letterSpacing: '1px'
            }}>
              조용하고 평화로운 장소를 찾아드립니다
            </p>
            
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                padding: '1.2rem 3rem',
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50px',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              시작하기 →
            </button>
          </div>
          
          <style>{`
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-10px); }
              60% { transform: translateY(-5px); }
            }
            @keyframes float {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(180deg); }
            }
          `}</style>
        </div>
        
        <LoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // 로딩 상태
  if (appState === 'loading') {
    return <LoadingScreen message="데이터 로딩 중..." />;
  }

  return (
    <LoadingProvider>
      <div className="app">
        <TopBar spotsCount={spots.length} onLogout={handleLogout} />
        
        <MainLayout>
          <div className="map-wrapper">
            <Map 
              places={spots} 
              onPlaceClick={handleSpotClick}
              selectedSpot={selectedSpot}
              onSpotsUpdate={loadSpots}
              onSpotDelete={handleSpotDelete}
            />
          </div>
          
          <FloatingPlaceList 
            places={spots} 
            onPlaceClick={handleSpotClick}
            userLocation={userLocation || undefined}
          />
        </MainLayout>

        {/* Location Button - positioned above ChatBot */}
        <LocationButton />

        {/* ChatBot - Non-intrusive floating component */}
        <ChatBot />
      </div>
    </LoadingProvider>
  );
}

export default App;
