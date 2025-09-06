import { useRef, useCallback, useEffect } from 'react';

interface MapOptions {
  center: { lat: number; lng: number };
  level: number;
}

export const useMapInstance = (mapRef: React.RefObject<HTMLDivElement>) => {
  const mapInstance = useRef<any>(null);
  const isInitialized = useRef(false);

  const initializeMap = useCallback((options: MapOptions) => {
    // @ts-ignore
    if (!mapRef.current || !window.kakao?.maps || isInitialized.current) return;

    const mapOptions = {
      // @ts-ignore
      center: new window.kakao.maps.LatLng(options.center.lat, options.center.lng),
      level: options.level
    };

    // @ts-ignore
    mapInstance.current = new window.kakao.maps.Map(mapRef.current, mapOptions);
    isInitialized.current = true;

    // Global access for debugging
    (window as any).mapInstance = mapInstance.current;

    return mapInstance.current;
  }, [mapRef]);

  const panTo = useCallback((lat: number, lng: number) => {
    if (!mapInstance.current) return;
    // @ts-ignore
    const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
    mapInstance.current.panTo(moveLatLng);
  }, []);

  const setLevel = useCallback((level: number) => {
    if (!mapInstance.current) return;
    mapInstance.current.setLevel(level);
  }, []);

  const getLevel = useCallback(() => {
    return mapInstance.current?.getLevel() || 8;
  }, []);

  const relayout = useCallback(() => {
    if (!mapInstance.current) return;
    mapInstance.current.relayout();
  }, []);

  useEffect(() => {
    return () => {
      isInitialized.current = false;
    };
  }, []);

  return {
    mapInstance: mapInstance.current,
    initializeMap,
    panTo,
    setLevel,
    getLevel,
    relayout,
    isInitialized: isInitialized.current
  };
};
