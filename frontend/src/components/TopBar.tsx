import { api } from '../api';

interface TopBarProps {
  spotsCount: number;
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ spotsCount, onLogout }) => {
  const currentUser = api.auth.getCurrentUser();
  
  return (
    <header className="top-bar">
      <div className="top-bar-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>🤫 쉿플레이스</h1>
          <p>조용하고 한적한 곳을 찾아보세요</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentUser && (
            <span style={{ color: 'white', fontSize: '0.9rem' }}>
              {currentUser.nickname}님 안녕하세요!
            </span>
          )}
          <span className="spots-count">📍 총 {spotsCount}개 장소</span>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              color: 'white',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
