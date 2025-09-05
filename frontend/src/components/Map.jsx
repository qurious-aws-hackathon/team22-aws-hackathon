import { useEffect, useRef } from 'react';

const Map = ({ places, onPlaceClick }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      // Fallback UI if Kakao API fails
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
              <h3>🗺️ 지도 로딩 중...</h3>
              <p>카카오 지도 API를 불러오고 있습니다</p>
            </div>
          </div>
        `;
      }
      return;
    }

    const container = mapRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심
      level: 8
    };

    mapInstance.current = new window.kakao.maps.Map(container, options);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !places.length) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Add new markers
    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      
      const marker = new window.kakao.maps.Marker({
        position: position,
        map: mapInstance.current
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding:10px; min-width:150px;">
            <h4>${place.name}</h4>
            <p>소음: ${['낮음', '보통', '높음'][place.noiseLevel]}</p>
            <p>혼잡: ${['낮음', '보통', '높음'][place.crowdLevel]}</p>
          </div>
        `
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infoWindow.open(mapInstance.current, marker);
        onPlaceClick?.(place);
      });

      markers.current.push(marker);
    });
  }, [places, onPlaceClick]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

export default Map;
