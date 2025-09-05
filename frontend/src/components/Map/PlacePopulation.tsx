import React, { useEffect, useRef } from 'react';

interface CongestionData {
  lat: number;
  lng: number;
  population: number;
  noiseLevel: number;
  congestLevel: string;
  address: string;
  name: string;
  populationMin?: number;
  populationMax?: number;
}

interface PlacePopulationProps {
  map: any;
  congestionData: CongestionData[];
}

const PlacePopulation: React.FC<PlacePopulationProps> = ({ map, congestionData }) => {
  const circlesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !congestionData.length || !(window as any).kakao?.maps?.Circle) return;

    // 기존 원들 제거
    circlesRef.current.forEach(circle => {
      try {
        if (circle && typeof circle.setMap === 'function') {
          circle.setMap(null);
        }
      } catch (error) {
        console.error('원 제거 실패:', error);
      }
    });
    circlesRef.current = [];

    // InfoWindow 닫기
    if (infoWindowRef.current) {
      try {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      } catch (error) {
        console.error('InfoWindow 제거 실패:', error);
      }
    }

    // 중복 제거
    const locationRecord: Record<string, CongestionData> = {};
    congestionData.forEach(data => {
      if (!data.lat || !data.lng || !data.congestLevel) return;
      const key = `${data.lat}_${data.lng}`;
      locationRecord[key] = data;
    });

    const uniqueLocations = Object.values(locationRecord);

    // 원형 생성
    uniqueLocations.forEach((data) => {
      const getRadiusAndOpacity = (level: string) => {
        switch(level) {
          case '여유': return { radius: 100, opacity: 0.3 };
          case '보통': return { radius: 150, opacity: 0.4 };
          case '약간 붐빔': return { radius: 200, opacity: 0.5 };
          case '붐빔': return { radius: 250, opacity: 0.6 };
          default: return { radius: 150, opacity: 0.4 };
        }
      };

      const getColor = (level: string) => {
        switch(level) {
          case '여유': return '#0066FF';
          case '보통': return '#00AA00';
          case '약간 붐빔': return '#FFD700';
          case '붐빔': return '#FF0000';
          default: return '#00AA00';
        }
      };

      const { radius, opacity } = getRadiusAndOpacity(data.congestLevel);
      const color = getColor(data.congestLevel);

      try {
        const circle = new (window as any).kakao.maps.Circle({
          center: new (window as any).kakao.maps.LatLng(data.lat, data.lng),
          radius: radius,
          strokeWeight: 0,
          fillColor: color,
          fillOpacity: opacity
        });

        circle.setMap(map);
        circlesRef.current.push(circle);

        // 호버 이벤트
        (window as any).kakao.maps.event.addListener(circle, 'mouseover', () => {
          const content = `
            <div style="padding: 12px; font-size: 14px; background: white; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); border: 1px solid #ddd; max-width: 220px;">
              <strong style="color: #333;">📍 ${data.name || '위치정보'}</strong><br>
              <strong style="color: #333;">🚶 유동인구: ${data.population?.toLocaleString() || '정보없음'}명</strong><br>
              <strong style="color: #666;">📊 혼잡도: ${data.congestLevel}</strong>
            </div>
          `;
          
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
          
          infoWindowRef.current = new (window as any).kakao.maps.InfoWindow({
            content: content,
            removable: false
          });
          
          infoWindowRef.current.open(map, new (window as any).kakao.maps.LatLng(data.lat, data.lng));
        });

        (window as any).kakao.maps.event.addListener(circle, 'mouseout', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
            infoWindowRef.current = null;
          }
        });

      } catch (error) {
        console.error('원 생성 실패:', error);
      }
    });

  }, [map, congestionData]);

  // 정리
  useEffect(() => {
    return () => {
      circlesRef.current.forEach(circle => {
        try {
          if (circle && typeof circle.setMap === 'function') {
            circle.setMap(null);
          }
        } catch (error) {
          console.error('정리 중 오류:', error);
        }
      });
      circlesRef.current = [];
      
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, []);

  // 범례
  return (
    <div style={{
      position: 'absolute',
      bottom: '30px',
      left: '20px',
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>혼잡도 범례</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#0066FF', borderRadius: '50%' }}></div>
          <span>여유</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#00AA00', borderRadius: '50%' }}></div>
          <span>보통</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#FFD700', borderRadius: '50%' }}></div>
          <span>약간 붐빔</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#FF0000', borderRadius: '50%' }}></div>
          <span>붐빔</span>
        </div>
      </div>
    </div>
  );
};

export default PlacePopulation;
