import axios from 'axios';

const KAKAO_REST_API_KEY = '8c1fdb56c5453d5dbdb8631e81eefabf';

interface KakaoDirectionsResponse {
  trans_id: string;
  routes: Array<{
    result_code: number;
    result_msg: string;
    summary: {
      origin: { x: number; y: number };
      destination: { x: number; y: number };
      distance: number;
      duration: number;
    };
    sections: Array<{
      distance: number;
      duration: number;
      roads: Array<{
        name: string;
        distance: number;
        duration: number;
        traffic_speed: number;
        traffic_state: number;
        vertexes: number[];
      }>;
    }>;
  }>;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface ProcessedRoute {
  points: RoutePoint[];
  distance: number;
  duration: number;
  roads: Array<{
    name: string;
    distance: number;
    traffic_state: number;
  }>;
}

export const kakaoDirectionsApi = {
  async getWalkingRoute(start: RoutePoint, end: RoutePoint, waypoints?: RoutePoint[]): Promise<ProcessedRoute> {
    try {
      console.log('🚶 카카오 모빌리티 API 호출:', start, waypoints ? `→ ${waypoints.length}개 경유지 →` : '→', end);
      
      // 경유지가 있는 경우와 없는 경우 구분
      const requestBody: any = {
        origin: {
          x: start.lng.toString(),
          y: start.lat.toString()
        },
        destination: {
          x: end.lng.toString(),
          y: end.lat.toString()
        },
        priority: 'RECOMMEND',
        car_fuel: 'GASOLINE',
        car_hipass: false,
        alternatives: false,
        road_details: true,
        summary: false
      };

      // 경유지가 있으면 추가
      if (waypoints && waypoints.length > 0) {
        requestBody.waypoints = waypoints.map(wp => ({
          x: wp.lng.toString(),
          y: wp.lat.toString(),
          name: `경유지${waypoints.indexOf(wp) + 1}`
        }));
      }
      
      // 올바른 카카오 모빌리티 API 호출
      const response = await axios.post<KakaoDirectionsResponse>(
        'https://apis-navi.kakaomobility.com/v1/waypoints/directions',
        requestBody,
        {
          headers: {
            'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        
        if (route.result_code === 0) {
          const points = this.extractRoutePoints(route);
          
          console.log('✅ 실제 카카오 경로 획득:', points.length, '개 지점');
          
          return {
            points,
            distance: route.summary.distance,
            duration: route.summary.duration,
            roads: route.sections.flatMap(section => 
              section.roads.map(road => ({
                name: road.name,
                distance: road.distance,
                traffic_state: road.traffic_state
              }))
            )
          };
        } else {
          throw new Error(`경로 탐색 실패: ${route.result_msg}`);
        }
      }
      
      throw new Error('경로를 찾을 수 없습니다');

    } catch (error) {
      console.warn('카카오 API 실패, 격자 경로 생성:', error);
      
      // API 실패 시 격자 도로 패턴으로 폴백
      const points = this.generateGridBasedPath(start, end);
      const distance = this.calculateTotalDistance(points);
      
      return {
        points,
        distance,
        duration: distance * 12, // 도보 속도 5km/h (12초/m)
        roads: [{ 
          name: '보행자 경로', 
          distance, 
          traffic_state: 1 
        }]
      };
    }
  },

  // 실제 경로에서 좌표 추출
  extractRoutePoints(route: any): RoutePoint[] {
    const points: RoutePoint[] = [];
    
    if (route.sections) {
      route.sections.forEach((section: any) => {
        if (section.roads) {
          section.roads.forEach((road: any) => {
            if (road.vertexes) {
              // vertexes는 [lng, lat, lng, lat, ...] 형태
              for (let i = 0; i < road.vertexes.length; i += 2) {
                points.push({
                  lng: road.vertexes[i],
                  lat: road.vertexes[i + 1]
                });
              }
            }
          });
        }
      });
    }
    
    return points;
  },

  // 격자 도로 패턴 시뮬레이션 (API 실패 시 사용)
  generateGridBasedPath(start: RoutePoint, end: RoutePoint): RoutePoint[] {
    const points: RoutePoint[] = [start];
    
    const latDiff = end.lat - start.lat;
    const lngDiff = end.lng - start.lng;
    
    // 격자 도로를 따라 이동 (L자 형태)
    const gridSize = 0.002; // 약 200m 간격
    
    let currentLat = start.lat;
    let currentLng = start.lng;
    
    // 먼저 위/아래로 이동
    while (Math.abs(currentLat - end.lat) > gridSize) {
      currentLat += latDiff > 0 ? gridSize : -gridSize;
      points.push({ lat: currentLat, lng: currentLng });
    }
    
    // 그 다음 좌/우로 이동
    while (Math.abs(currentLng - end.lng) > gridSize) {
      currentLng += lngDiff > 0 ? gridSize : -gridSize;
      points.push({ lat: currentLat, lng: currentLng });
    }
    
    // 최종 목적지
    points.push(end);
    
    return points;
  },

  calculateTotalDistance(points: RoutePoint[]): number {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      total += calculateDistance(points[i], points[i + 1]);
    }
    return total;
  }
};

// 두 점 사이의 거리 계산 (미터)
function calculateDistance(start: RoutePoint, end: RoutePoint): number {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = start.lat * Math.PI / 180;
  const φ2 = end.lat * Math.PI / 180;
  const Δφ = (end.lat - start.lat) * Math.PI / 180;
  const Δλ = (end.lng - start.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
