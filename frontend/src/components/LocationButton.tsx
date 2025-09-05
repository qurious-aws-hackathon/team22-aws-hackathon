import { useState } from 'react';

const LocationButton: React.FC = () => {
  const [isLocating, setIsLocating] = useState(false);

  const handleLocationClick = () => {
    if (isLocating) return;
    
    setIsLocating(true);
    
    if (!navigator.geolocation) {
      alert('위치 서비스를 지원하지 않는 브라우저입니다.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Kakao Map API를 직접 사용하여 지도 이동
        if ((window as any).kakao && (window as any).kakao.maps) {
          const mapContainer = document.getElementById('map');
          if (mapContainer) {
            // 전역 지도 인스턴스에 접근
            const maps = (window as any).kakao.maps;
            const moveLatLng = new maps.LatLng(latitude, longitude);
            
            // 지도 인스턴스 찾기 (전역 변수 또는 DOM에서)
            const mapInstance = (window as any).mapInstance;
            if (mapInstance) {
              mapInstance.setCenter(moveLatLng);
              mapInstance.setLevel(3);
              
              // 현재 위치 마커 추가
              const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
              const imageSize = new maps.Size(32, 32);
              const markerImage = new maps.MarkerImage(imageSrc, imageSize);
              
              new maps.Marker({
                position: moveLatLng,
                image: markerImage,
                map: mapInstance
              });
            }
          }
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
        maximumAge: 60000
      }
    );
  };

  return (
    <button
      onClick={handleLocationClick}
      disabled={isLocating}
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: 'white',
        color: '#007bff',
        border: '2px solid #007bff',
        fontSize: '20px',
        cursor: isLocating ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 999,
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isLocating ? 0.6 : 1
      }}
      title="내 위치 찾기"
    >
      {isLocating ? '⏳' : '📍'}
    </button>
  );
};

export default LocationButton;
