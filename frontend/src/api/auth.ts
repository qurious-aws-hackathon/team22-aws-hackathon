import { spotsClient } from './config';
import { LoginRequest, RegisterRequest, AuthResponse, User } from './models/user';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // 임시: 로컬 스토리지 기반 로그인
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const user = existingUsers.find((u: any) => 
        u.nickname === credentials.nickname && u.password === credentials.password
      );
      
      if (!user) {
        return {
          success: false,
          message: '아이디 또는 비밀번호가 잘못되었습니다.'
        };
      }
      
      // 로컬 스토리지에 사용자 정보 저장
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('authToken', 'temp-token');
      
      return {
        success: true,
        message: '로그인 성공',
        user: user,
        token: 'temp-token'
      };
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
      // 임시: 로컬 스토리지 기반 회원가입
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      
      // 중복 확인
      if (existingUsers.find((u: any) => u.nickname === userData.nickname)) {
        return {
          success: false,
          message: '이미 사용 중인 아이디입니다.'
        };
      }
      
      // 새 사용자 추가
      const newUser = {
        id: Date.now().toString(),
        nickname: userData.nickname,
        password: userData.password, // 실제로는 해시화해야 함
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      existingUsers.push(newUser);
      localStorage.setItem('users', JSON.stringify(existingUsers));
      
      return {
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: newUser
      };
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