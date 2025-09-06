import { useRef, useCallback, useState } from 'react';

export const useLocationManager = (mapInstance: any) => {
  const currentLocationMarkerRef = useRef<any>(null);
  const [isLocating, setIsLocating] = useState(false);

  const createLocationMarkerIcon = useCallback(() => {
    const imageSrc = 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `);

    return new window.kakao.maps.MarkerImage(
      imageSrc,
      new window.kakao.maps.Size(32, 32)
    );
  }, []);

  const addCurrentLocationMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstance) return;

    // Remove existing marker
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
    }

    const position = new window.kakao.maps.LatLng(lat, lng);
    const markerImage = createLocationMarkerIcon();

    currentLocationMarkerRef.current = new window.kakao.maps.Marker({
      position,
      image: markerImage,
      map: mapInstance
    });
  }, [mapInstance, createLocationMarkerIcon]);

  const moveToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('위치 서비스를 지원하지 않는 브라우저입니다.');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setIsLocating(true);

    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          if (mapInstance) {
            const moveLatLng = new window.kakao.maps.LatLng(latitude, longitude);
            mapInstance.panTo(moveLatLng);

            setTimeout(() => {
              if (mapInstance.getLevel() !== 3) {
                mapInstance.setLevel(3);
              }
            }, 300);

            addCurrentLocationMarker(latitude, longitude);
          }

          setIsLocating(false);
          resolve({ latitude, longitude });
        },
        (error) => {
          console.error('위치 정보를 가져올 수 없습니다:', error);
          alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
          setIsLocating(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }, [mapInstance, addCurrentLocationMarker]);

  const clearCurrentLocationMarker = useCallback(() => {
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
      currentLocationMarkerRef.current = null;
    }
  }, []);

  return {
    moveToCurrentLocation,
    addCurrentLocationMarker,
    clearCurrentLocationMarker,
    isLocating
  };
};
