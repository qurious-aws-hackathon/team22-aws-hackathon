export interface User {
  id: string; // UUID
  nickname: string; // DDB에서는 nickname 사용
  password: string; // 해시된 비밀번호
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  nickname: string; // username 대신 nickname 사용
  password: string;
}

export interface RegisterRequest {
  nickname: string; // username 대신 nickname 사용
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}