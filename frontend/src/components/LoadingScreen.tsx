import { useState, useEffect } from 'react';

const LoadingScreen = ({ message = '데이터 로딩 중...' }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-icon">
          <div className="quiet-animation">
            <span className="shh-emoji">🤫</span>
            <div className="sound-waves">
              <div className="wave wave-1"></div>
              <div className="wave wave-2"></div>
              <div className="wave wave-3"></div>
            </div>
          </div>
        </div>
        
        <h2 className="loading-title">쉿플레이스</h2>
        <p className="loading-message">{message}{dots}</p>
        
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
        
        <p className="loading-subtitle">조용한 공간을 찾고 있어요</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
