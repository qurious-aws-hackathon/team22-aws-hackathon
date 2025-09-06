import { spotsClient } from './config';
import { LoginRequest, RegisterRequest, AuthResponse, User } from './models/user';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await spotsClient.post('/auth/login', {
        nickname: credentials.nickname,  // Lambda가 nickname을 기대할 수 있음
        password: credentials.password
      });
      
      const data = response.data;
      
      if (data.success && data.user) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token || 'temp-token');
      }
      
      return data;
    } catch (error: any) {
      console.error('Login API Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '로그인에 실패했습니다.'
      };
    }
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await spotsClient.post('/auth/register', {
        nickname: userData.nickname,  // Lambda가 nickname을 기대할 수 있음
        password: userData.password
      });
      
      const data = response.data;
      
      if (data.success && data.user) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token || 'temp-token');
      }
      
      return data;
    } catch (error: any) {
      console.error('Register API Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '회원가입에 실패했습니다.'
      };
    }
  },

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  },

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }
};
