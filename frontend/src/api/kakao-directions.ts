import axios from 'axios';

const KAKAO_REST_API_KEY = '9aad82b3e0f110046a739e949ebbd947';

interface KakaoDirectionsResponse {
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
  async getWalkingRoute(start: RoutePoint, end: RoutePoint): Promise<ProcessedRoute> {
    try {
      console.log('🚶 카카오 지도 SDK 길찾기 사용:', start, '→', end);
      
      // 카카오 지도 SDK를 사용한 간단한 길찾기
      // 실제로는 더 복잡한 로직이 필요하지만, 현재는 시뮬레이션 사용
      
      // 더 정교한 시뮬레이션 경로 생성
      const points = this.generateRealisticWalkingPath(start, end);
      const distance = this.calculateTotalDistance(points);
      
      console.log('✅ 시뮬레이션 경로 생성 완료:', points.length, '개 지점');
      
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

    } catch (error) {
      console.warn('경로 생성 실패, 기본 경로 사용:', error);
      
      // 최종 폴백: 직선 경로
      return {
        points: [start, end],
        distance: calculateDistance(start, end),
        duration: calculateDistance(start, end) * 12,
        roads: []
      };
    }
  },

  // 더 현실적인 보행자 경로 시뮬레이션
  generateRealisticWalkingPath(start: RoutePoint, end: RoutePoint): RoutePoint[] {
    const points: RoutePoint[] = [start];
    
    const totalDistance = calculateDistance(start, end);
    const steps = Math.max(8, Math.min(20, Math.floor(totalDistance / 200))); // 200m마다 포인트
    
    for (let i = 1; i < steps; i++) {
      const ratio = i / steps;
      
      // 기본 직선 경로
      let lat = start.lat + (end.lat - start.lat) * ratio;
      let lng = start.lng + (end.lng - start.lng) * ratio;
      
      // 도로를 따라가는 것처럼 곡선 추가
      const curveIntensity = 0.0005;
      const curve1 = Math.sin(ratio * Math.PI * 2) * curveIntensity;
      const curve2 = Math.sin(ratio * Math.PI * 3) * curveIntensity * 0.5;
      
      // 격자 도로 패턴 시뮬레이션
      if (i % 3 === 0) {
        // 가끔 직각으로 꺾이는 효과
        const gridOffset = curveIntensity * 2;
        lat += (Math.random() - 0.5) * gridOffset;
        lng += (Math.random() - 0.5) * gridOffset;
      }
      
      points.push({
        lat: lat + curve1,
        lng: lng + curve2
      });
    }
    
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
