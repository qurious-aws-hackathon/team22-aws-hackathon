// 실제 DynamoDB Spots 테이블 구조에 맞는 모델
export interface Spot {
  id: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  geohash: string;
  noise_level: number;
  rating: number;
  quiet_rating: number;
  category?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
  like_count: number;
  dislike_count: number;
  is_noise_recorded?: boolean;
}

// 스팟 생성 요청 (Lambda createSpot 함수용)
export interface CreateSpotRequest {
  name: string;
  description?: string;
  lat: number;
  lng: number;
  noise_level: number;
  rating: number;
  quiet_rating: number;
  category?: string;
  user_id?: string;
  is_noise_recorded?: boolean;
  image_url?: string;
}

// 스팟 업데이트 요청 (Lambda updateSpot 함수용)
export interface UpdateSpotRequest {
  name?: string;
  description?: string;
  noise_level?: number;
  rating?: number;
  category?: string;
}

// 스팟 검색 요청 (Lambda getSpots 함수용)
export interface GetSpotsRequest {
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
}

// 스팟 상세 응답 (getSpotDetail Lambda 응답)
export interface GetSpotDetailResponse extends Spot {
  comments?: Comment[];
}
