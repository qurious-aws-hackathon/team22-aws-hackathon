import { useState } from 'react';
import { authApi } from '../api/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    nickname: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUsername = (username: string) => {
    return /^[a-zA-Z0-9]{4,20}$/.test(username);
  };

  const validatePassword = (password: string) => {
    return /^[a-zA-Z0-9!@#$%^&*]{6,20}$/.test(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateUsername(formData.nickname)) {
      const message = '아이디는 영문+숫자 4-20자로 입력해주세요.';
      setError(message);
      alert(message);
      setLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      const message = '비밀번호는 영문+숫자+특수문자(!@#$%^&*) 6-20자로 입력해주세요.';
      setError(message);
      alert(message);
      setLoading(false);
      return;
    }

    try {
      const result = isLogin 
        ? await authApi.login(formData)
        : await authApi.register(formData);

      if (result.success) {
        if (isLogin) {
          onLoginSuccess();
          onClose();
        } else {
          setIsLogin(true);
          setError('');
          alert('회원가입이 완료되었습니다. 로그인해주세요.');
        }
        setFormData({ nickname: '', password: '' });
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('서버 오류가 발생했습니다.');
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      <div style={{
        background: isLogin ? 'white' : 'linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%)',
        borderRadius: isLogin ? '12px' : '20px',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px',
        position: 'relative',
        border: isLogin ? 'none' : '2px solid rgba(102, 126, 234, 0.2)',
        boxShadow: isLogin ? '0 10px 40px rgba(0,0,0,0.1)' : '0 20px 60px rgba(102, 126, 234, 0.15)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1rem'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontSize: isLogin ? '2.5rem' : '3rem',
            marginBottom: '0.5rem'
          }}>
            {isLogin ? '🔑' : '🎆'}
          </div>
          <h2 style={{ 
            margin: 0,
            color: isLogin ? '#333' : '#667eea',
            fontSize: isLogin ? '1.5rem' : '1.8rem',
            fontWeight: isLogin ? '600' : '700'
          }}>
            {isLogin ? '로그인' : '회원가입'}
          </h2>
          <p style={{
            margin: '0.5rem 0 0 0',
            fontSize: '0.9rem',
            color: '#666',
            opacity: 0.8
          }}>
            {isLogin ? '쉿플레이스에 오신 것을 환영합니다' : '새로운 여정을 시작해보세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              아이디
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
              placeholder="username123"
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
              placeholder="password123!"
              required
            />
          </div>

          {error && (
            <div style={{
              color: '#ff4757',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: isLogin ? '#667eea' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: isLogin ? '6px' : '12px',
              fontSize: '1rem',
              fontWeight: isLogin ? '500' : '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: isLogin ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          >
            {loading ? '처리중...' : (isLogin ? '로그인' : '회원가입')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ nickname: '', password: '' });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isLogin ? '회원가입하기' : '로그인하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;