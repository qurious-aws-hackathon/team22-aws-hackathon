import { kakaoDirectionsApi, type RoutePoint, type ProcessedRoute } from './kakao-directions';
import { api } from './index';

interface QuietRouteOptions {
  preferQuiet: boolean;
  avoidCrowded: boolean;
  maxDetour: number; // 최대 우회 거리 (미터)
}

interface RouteSegment {
  start: RoutePoint;
  end: RoutePoint;
  distance: number;
  quietness_score: number;
  congestion_level: number;
}

export const quietRouteApi = {
  async findQuietRoute(
    start: RoutePoint, 
    end: RoutePoint, 
    options: QuietRouteOptions = {
      preferQuiet: true,
      avoidCrowded: true,
      maxDetour: 500
    },
    waypoints?: RoutePoint[]
  ): Promise<ProcessedRoute & { quietness_score: number }> {
    
    try {
      // 1. 기본 카카오 경로 획득 (경유지 포함)
      const baseRoute = await kakaoDirectionsApi.getWalkingRoute(start, end, waypoints);
      
      // 2. 경로 주변의 조용함 데이터 수집
      const quietnessData = await this.collectQuietnessData(baseRoute.points);
      
      // 3. 경로 세그먼트별 조용함 점수 계산
      const segments = this.analyzeRouteSegments(baseRoute.points, quietnessData);
      
      // 4. 조용함 점수 계산
      const quietness_score = this.calculateOverallQuietness(segments);
      
      // 5. 필요시 대안 경로 탐색 (향후 구현)
      if (quietness_score < 50 && options.preferQuiet) {
        // TODO: 대안 경로 로직
      }
      
      
      return {
        ...baseRoute,
        quietness_score
      };
      
    } catch (error) {
      console.error('조용한 경로 탐색 실패:', error);
      
      // 실패 시 기본 경로 반환
      const fallbackRoute = await kakaoDirectionsApi.getWalkingRoute(start, end);
      return {
        ...fallbackRoute,
        quietness_score: 50 // 기본값
      };
    }
  },

  async collectQuietnessData(routePoints: RoutePoint[]): Promise<Map<string, number>> {
    const quietnessMap = new Map<string, number>();
    
    try {
      // 경로 주변 500m 반경의 스팟 데이터 수집
      const spots = await api.spots.getSpots();
      
      routePoints.forEach(point => {
        let totalQuietness = 0;
        let nearbySpots = 0;
        
        spots.forEach(spot => {
          const distance = this.calculateDistance(point, {
            lat: spot.lat,
            lng: spot.lng
          });
          
          // 200m 이내의 스팟만 고려
          if (distance <= 200) {
            totalQuietness += spot.quiet_rating;
            nearbySpots++;
          }
        });
        
        // 주변 스팟이 없으면 기본값 (도로 유형에 따라)
        const quietness = nearbySpots > 0 
          ? totalQuietness / nearbySpots 
          : this.getDefaultQuietness(point);
        
        const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
        quietnessMap.set(key, quietness);
      });
      
    } catch (error) {
      console.error('조용함 데이터 수집 실패:', error);
    }
    
    return quietnessMap;
  },

  analyzeRouteSegments(points: RoutePoint[], quietnessData: Map<string, number>): RouteSegment[] {
    const segments: RouteSegment[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const distance = this.calculateDistance(start, end);
      
      const startKey = `${start.lat.toFixed(6)},${start.lng.toFixed(6)}`;
      const endKey = `${end.lat.toFixed(6)},${end.lng.toFixed(6)}`;
      
      const startQuietness = quietnessData.get(startKey) || 50;
      const endQuietness = quietnessData.get(endKey) || 50;
      const avgQuietness = (startQuietness + endQuietness) / 2;
      
      segments.push({
        start,
        end,
        distance,
        quietness_score: avgQuietness,
        congestion_level: 100 - avgQuietness // 조용함의 반대
      });
    }
    
    return segments;
  },

  calculateOverallQuietness(segments: RouteSegment[]): number {
    if (segments.length === 0) return 50;
    
    let totalWeightedQuietness = 0;
    let totalDistance = 0;
    
    segments.forEach(segment => {
      totalWeightedQuietness += segment.quietness_score * segment.distance;
      totalDistance += segment.distance;
    });
    
    return totalDistance > 0 ? totalWeightedQuietness / totalDistance : 50;
  },

  getDefaultQuietness(_point: RoutePoint): number {
    // 실제로는 도로 유형, 시간대 등을 고려해야 함
    // 현재는 기본값 반환
    return 60; // 보통 수준
  },

  calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
};
