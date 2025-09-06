import { useRef, useCallback, useState } from 'react';
import { type LatLng, type RouteState } from '../../../api/models/route';
import { quietRouteApi } from '../../../api/quiet-route';
import { Spot } from '../../../api';

interface RouteCallbacks {
  onAlert?: (type: 'success' | 'error', message: string) => void;
}

export const useRouteManager = (mapInstance: any, callbacks: RouteCallbacks) => {
  const routeMarkersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const startPointRef = useRef<LatLng | null>(null);
  const endPointRef = useRef<LatLng | null>(null);
  const waypointsRef = useRef<LatLng[]>([]);
  
  const [routeState, setRouteState] = useState<RouteState>({
    startPoint: null,
    endPoint: null,
    isRouteMode: false,
    recommendedRoute: null
  });

  const utf8ToBase64 = useCallback((str: string) => {
    return btoa(unescape(encodeURIComponent(str)));
  }, []);

  const createRouteMarkerIcon = useCallback((type: 'start' | 'end' | 'waypoint', waypointNumber?: number) => {
    let markerSvg = '';

    switch (type) {
      case 'start':
        markerSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <linearGradient id="startGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#66BB6A;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2E7D32;stop-opacity:1" />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <path d="M24 0C15.163 0 8 7.163 8 16c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" 
                  fill="url(#startGradient)" filter="url(#shadow)"/>
            <circle cx="24" cy="16" r="10" fill="white"/>
            <path d="M19 16l4-4 4 4-4 4z" fill="#2E7D32"/>
          </svg>
        `;
        break;
      case 'end':
        markerSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <linearGradient id="endGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#EF5350;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#C62828;stop-opacity:1" />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <path d="M24 0C15.163 0 8 7.163 8 16c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" 
                  fill="url(#endGradient)" filter="url(#shadow)"/>
            <circle cx="24" cy="16" r="10" fill="white"/>
            <rect x="20" y="12" width="8" height="8" fill="#C62828"/>
          </svg>
        `;
        break;
      case 'waypoint':
        markerSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <linearGradient id="waypointGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#FFA726;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#E65100;stop-opacity:1" />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <path d="M24 0C15.163 0 8 7.163 8 16c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" 
                  fill="url(#waypointGradient)" filter="url(#shadow)"/>
            <circle cx="24" cy="16" r="10" fill="white"/>
            <text x="24" y="21" text-anchor="middle" font-size="12" fill="#E65100" font-weight="bold">${waypointNumber || 1}</text>
          </svg>
        `;
        break;
    }

    const imageSrc = 'data:image/svg+xml;base64,' + utf8ToBase64(markerSvg);
    return new window.kakao.maps.MarkerImage(
      imageSrc,
      new window.kakao.maps.Size(48, 60)
    );
  }, [utf8ToBase64]);

  const addRouteMarker = useCallback((lat: number, lng: number, type: 'start' | 'end' | 'waypoint') => {
    if (!mapInstance) return;

    const position = new window.kakao.maps.LatLng(lat, lng);
    const waypointNumber = type === 'waypoint' ? waypointsRef.current.length : undefined;
    const markerImage = createRouteMarkerIcon(type, waypointNumber);

    const marker = new window.kakao.maps.Marker({
      position,
      image: markerImage,
      map: mapInstance
    });

    routeMarkersRef.current.push(marker);
  }, [mapInstance, createRouteMarkerIcon]);

  const clearRoute = useCallback(() => {
    // Clear markers
    routeMarkersRef.current.forEach(marker => marker?.setMap?.(null));
    routeMarkersRef.current = [];

    // Clear polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    // Reset state
    startPointRef.current = null;
    endPointRef.current = null;
    waypointsRef.current = [];

    setRouteState({
      startPoint: null,
      endPoint: null,
      isRouteMode: false,
      recommendedRoute: null
    });
  }, []);

  const setStartPoint = useCallback((lat: number, lng: number) => {
    clearRoute();
    const startPoint = { lat, lng };
    startPointRef.current = startPoint;
    
    setRouteState(prev => ({
      ...prev,
      startPoint,
      isRouteMode: true
    }));
    
    addRouteMarker(lat, lng, 'start');
  }, [clearRoute, addRouteMarker]);

  const setEndPoint = useCallback(async (lat: number, lng: number) => {
    if (!startPointRef.current) {
      return;
    }

    const endPoint = { lat, lng };
    endPointRef.current = endPoint;
    
    setRouteState(prev => ({
      ...prev,
      endPoint
    }));
    
    addRouteMarker(lat, lng, 'end');
    await drawQuietRoute(startPointRef.current, endPoint, waypointsRef.current);
  }, [addRouteMarker]);

  const addWaypoint = useCallback((lat: number, lng: number) => {
    if (!startPointRef.current) {
      return;
    }

    const waypoint = { lat, lng };
    waypointsRef.current.push(waypoint);
    addRouteMarker(lat, lng, 'waypoint');
  }, [addRouteMarker]);

  const calculateDistance = useCallback((point1: LatLng, point2: LatLng): number => {
    const R = 6371e3;
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }, []);

  const findNearbyQuietPlaces = useCallback((routePoints: LatLng[], allPlaces: Spot[], maxDistance: number): Spot[] => {
    if (!routePoints?.length || !allPlaces?.length) return [];

    // 출발지와 도착지만 사용 (경로의 첫 번째와 마지막 점)
    const startPoint = routePoints[0];
    const endPoint = routePoints[routePoints.length - 1];
    
    return allPlaces.filter(place => {
      const placePoint = { lat: place.lat, lng: place.lng };
      if (!placePoint.lat || !placePoint.lng) return false;

      const distanceFromStart = calculateDistance(startPoint, placePoint);
      const distanceFromEnd = calculateDistance(endPoint, placePoint);
      
      // 출발지 또는 도착지 중 하나라도 maxDistance 이내에 있으면 추천
      return distanceFromStart <= maxDistance || distanceFromEnd <= maxDistance;
    });
  }, [calculateDistance]);

  const drawQuietRoute = useCallback(async (start: LatLng, end: LatLng, waypoints: LatLng[] = []) => {
    try {
      const routeData = await quietRouteApi.findQuietRoute(start, end, {
        preferQuiet: true,
        avoidCrowded: true,
        maxDetour: 500
      }, waypoints);

      const linePath = routeData.points.map(point =>
        new window.kakao.maps.LatLng(point.lat, point.lng)
      );

      const quietnessScore = routeData.quietness_score || 0.7;
      const routeColor = quietnessScore > 0.8 ? '#4CAF50' :
                        quietnessScore > 0.6 ? '#8BC34A' :
                        quietnessScore > 0.4 ? '#FFC107' : '#FF9800';

      const polyline = new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 6,
        strokeColor: routeColor,
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
      });

      polyline.setMap(mapInstance);
      routePolylineRef.current = polyline;

      const distanceKm = (routeData.distance / 1000).toFixed(1);
      const durationMin = Math.ceil(routeData.duration / 60);
      const quietnessPercent = Math.round(quietnessScore * 100);

      setRouteState(prev => ({
        ...prev,
        recommendedRoute: {
          id: `route_${Date.now()}`,
          distance: routeData.distance,
          duration: routeData.duration,
          points: routeData.points,
          quietness_score: quietnessScore,
          estimated_time: routeData.duration,
          congestion_levels: []
        }
      }));

      // callbacks.onAlert?.('success', 
      //   `🤫 조용한 경로 찾기 완료!\n거리: ${distanceKm}km, 시간: ${durationMin}분\n조용함 지수: ${quietnessPercent}%`
      // );

      return routeData;

    } catch (error) {
      console.error('조용한 경로 탐색 실패:', error);
      callbacks.onAlert?.('error', '경로를 찾을 수 없습니다. 다시 시도해주세요.');
      throw error;
    }
  }, [mapInstance, callbacks]);

  return {
    routeState,
    setStartPoint,
    setEndPoint,
    addWaypoint,
    clearRoute,
    drawQuietRoute,
    findNearbyQuietPlaces,
    calculateDistance
  };
};
