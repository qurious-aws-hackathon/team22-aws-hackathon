// 실제 DynamoDB SpotLikes 테이블 구조에 맞는 모델
export interface SpotLike {
  spot_id: string;
  user_id?: string;
  session_id?: string;
  reaction_type: 'like' | 'dislike';
  created_at: string;
}

// 좋아요/싫어요 응답
export interface ReactionResponse {
  success: boolean;
  message: string;
  likes: number;
  dislikes: number;
}
