// 실제 DynamoDB SpotReactions 테이블 구조에 맞는 모델
export interface SpotReaction {
  id: string; // userId#spotId 형태
  user_id: string;
  spot_id: string;
  type: 'like' | 'dislike';
  created_at: string;
}

// 좋아요/싫어요 응답
export interface ReactionResponse {
  success: boolean;
  message: string;
  likes: number;
  dislikes: number;
  userReaction?: 'like' | 'dislike' | null;
}
