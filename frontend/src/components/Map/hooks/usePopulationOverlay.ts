import { useRef, useCallback, useMemo } from 'react';
import { RealtimePopulationData } from '../../../api';

export const usePopulationOverlay = (mapInstance: any) => {
  const crowdPolygonsRef = useRef<any[]>([]);
  const noiseCirclesRef = useRef<any[]>([]);

  const colorSchemes = useMemo(() => ({
    crowd: {
      80: '#FF6B6B',
      60: '#FFB347',
      40: '#FFE66D',
      20: '#95E1D3',
      0: '#A8E6CF'
    },
    noise: {
      70: '#FF8A95',
      50: '#FECA57',
      30: '#48CAE4',
      0: '#B8E6B8'
    }
  }), []);

  const getCrowdColor = useCallback((crowdLevel: number) => {
    const { crowd } = colorSchemes;
    if (crowdLevel >= 80) return crowd[80];
    if (crowdLevel >= 60) return crowd[60];
    if (crowdLevel >= 40) return crowd[40];
    if (crowdLevel >= 20) return crowd[20];
    return crowd[0];
  }, [colorSchemes]);

  const getNoiseColor = useCallback((noiseLevel: number) => {
    const { noise } = colorSchemes;
    if (noiseLevel >= 70) return noise[70];
    if (noiseLevel >= 50) return noise[50];
    if (noiseLevel >= 30) return noise[30];
    return noise[0];
  }, [colorSchemes]);

  const createNaturalCircles = useCallback((latitude: number, longitude: number, color: string, intensity: number): any[] => {
    if (!mapInstance) return [];

    const circles: any[] = [];
    const center = new window.kakao.maps.LatLng(latitude, longitude);

    const layers = [
      { radius: 100, opacity: Math.min(0.6, intensity / 100 * 0.6) },
      { radius: 200, opacity: Math.min(0.4, intensity / 100 * 0.4) },
      { radius: 300, opacity: Math.min(0.2, intensity / 100 * 0.2) },
      { radius: 400, opacity: Math.min(0.1, intensity / 100 * 0.1) }
    ];

    layers.forEach(layer => {
      const circle = new window.kakao.maps.Circle({
        center: center,
        radius: layer.radius,
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: layer.opacity
      });

      circle.setMap(mapInstance);
      circles.push(circle);
    });

    return circles;
  }, [mapInstance]);

  const clearOverlays = useCallback(() => {
    crowdPolygonsRef.current.forEach(polygon => polygon?.setMap?.(null));
    crowdPolygonsRef.current = [];
    
    noiseCirclesRef.current.forEach(circle => circle?.setMap?.(null));
    noiseCirclesRef.current = [];
  }, []);

  const updateCrowdPolygons = useCallback((populationData: RealtimePopulationData[]) => {
    // Clear existing polygons
    crowdPolygonsRef.current.forEach(polygon => polygon?.setMap?.(null));
    crowdPolygonsRef.current = [];

    if (!mapInstance || !populationData?.length) return;

    populationData.forEach((data: any) => {
      const { lat, lng } = data;
      if (!lat || !lng) return;

      const crowdLevel = data.crowdLevel || data.crowd_level || 50;
      const color = getCrowdColor(crowdLevel);

      // Create hover circle
      const hoverCircle = new window.kakao.maps.Circle({
        center: new window.kakao.maps.LatLng(lat, lng),
        radius: 400,
        strokeWeight: 0,
        fillColor: 'transparent',
        fillOpacity: 0
      });

      hoverCircle.setMap(mapInstance);

      // Add hover events
      window.kakao.maps.event.addListener(hoverCircle, 'mouseover', () => {
        const content = `
          <div style="padding: 12px; font-size: 14px; background: white; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); border: 1px solid #ddd; max-width: 220px;">
            <strong style="color: #333;">📍 ${data.name || '위치정보'}</strong><br>
            <strong style="color: #333;">🚶 유동인구: ${data.population?.toLocaleString() || '정보없음'}명</strong><br>
            <strong style="color: #666;">📊 혼잡도: ${crowdLevel}%</strong><br>
            <div style="margin-top: 8px; padding: 4px 8px; background: ${color}; border-radius: 4px; font-size: 12px;">
              ${crowdLevel >= 80 ? '🔴 매우 혼잡' : crowdLevel >= 60 ? '🟠 혼잡' : crowdLevel >= 40 ? '🟡 보통' : crowdLevel >= 20 ? '🟢 여유' : '🔵 한적'}
            </div>
          </div>
        `;

        const tempInfoWindow = new window.kakao.maps.InfoWindow({
          content: content,
          removable: false
        });

        tempInfoWindow.open(mapInstance, new window.kakao.maps.LatLng(lat, lng));

        window.kakao.maps.event.addListener(hoverCircle, 'mouseout', () => {
          tempInfoWindow.close();
        });
      });

      crowdPolygonsRef.current.push(hoverCircle);
    });
  }, [mapInstance, getCrowdColor]);

  const updateNoiseCircles = useCallback((populationData: RealtimePopulationData[]) => {
    // Clear existing circles
    noiseCirclesRef.current.forEach(circle => circle?.setMap?.(null));
    noiseCirclesRef.current = [];

    if (!mapInstance || !populationData?.length) return;

    populationData.forEach((data: any) => {
      const { lat, lng } = data;
      if (!lat || !lng) return;

      const noiseLevel = data.noiseLevel || data.noise_level || 40;
      const color = getNoiseColor(noiseLevel);

      const circles = createNaturalCircles(lat, lng, color, noiseLevel);
      
      // Adjust circle sizes for noise visualization
      circles.forEach((circle, index) => {
        const smallRadius = [60, 120, 180, 240][index];
        circle.setRadius(smallRadius);
      });

      circles.forEach(circle => noiseCirclesRef.current.push(circle));
    });
  }, [mapInstance, getNoiseColor, createNaturalCircles]);

  const updateOverlays = useCallback((populationData: RealtimePopulationData[], showCongestion: boolean) => {
    if (showCongestion) {
      updateCrowdPolygons(populationData);
      updateNoiseCircles(populationData);
    } else {
      clearOverlays();
    }
  }, [updateCrowdPolygons, updateNoiseCircles, clearOverlays]);

  return {
    updateOverlays,
    clearOverlays,
    updateCrowdPolygons,
    updateNoiseCircles
  };
};
