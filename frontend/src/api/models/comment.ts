// 실제 DynamoDB Comments 테이블 구조에 맞는 모델
export interface Comment {
  id: string;
  spot_id: string;
  content: string;
  user_id?: string;
  nickname?: string;
  created_at: string;
}

// 댓글 생성 요청 (Lambda addComment 함수용)
export interface CreateCommentRequest {
  spot_id: string;
  content: string;
  user_id?: string;
  nickname?: string;
}

// 댓글 목록 조회 요청
export interface GetCommentsRequest {
  spot_id: string;
  limit?: number;
  last_evaluated_key?: string;
}
