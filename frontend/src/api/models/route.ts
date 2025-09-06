export interface LatLng {
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  points: LatLng[];
  distance: number;
  quietness_score: number;
  estimated_time: number;
  congestion_levels: number[];
}

export interface RouteState {
  startPoint: LatLng | null;
  endPoint: LatLng | null;
  isRouteMode: boolean;
  recommendedRoute: Route | null;
}
