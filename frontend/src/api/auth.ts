import { spotsClient } from './config';
import { LoginRequest, RegisterRequest, AuthResponse, User } from './models/user';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch('https://api.shitplace.net/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // 로컬 스토리지에 사용자 정보 저장
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token || 'temp-token');
      }
      
      return data;
    } catch (error: any) {
      console.error('Login API Error:', error);
      return {
        success: false,
        message: '로그인에 실패했습니다.'
      };
    }
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch('https://api.shitplace.net/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // 로컬 스토리지에 사용자 정보 저장
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token || 'temp-token');
      }
      
      return data;
    } catch (error: any) {
      console.error('Register API Error:', error);
      return {
        success: false,
        message: '회원가입에 실패했습니다.'
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