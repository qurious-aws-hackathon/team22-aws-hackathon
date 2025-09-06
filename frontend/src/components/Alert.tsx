import { useEffect } from 'react';

interface AlertProps {
  type: 'success' | 'error';
  message: string;
  isOpen: boolean;
  onClose: () => void;
  autoClose?: boolean;
}

const Alert: React.FC<AlertProps> = ({ type, message, isOpen, onClose, autoClose = false }) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  const bgColor = type === 'success' ? '#4CAF50' : '#F44336';
  const icon = type === 'success' ? '✓' : '✕';

  if (autoClose) {
    // 화면 하단 토스트 스타일
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bgColor,
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '90vw',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <span>{icon}</span>
        <span>{message}</span>
        <style>{`
          @keyframes slideUp {
            from { transform: translateX(-50%) translateY(100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // 모달 스타일 - Header 디자인 적용
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: type === 'success'
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        color: 'white',
        animation: 'alertSlideIn 0.3s ease-out'
      }}>

        <div style={{
          fontSize: '18px',
          marginBottom: '28px',
          lineHeight: '1.6',
          fontWeight: '500',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}>
          {message}
        </div>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            padding: '14px 28px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            minWidth: '100px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          확인
        </button>
        <style>{`
          @keyframes alertSlideIn {
            from { 
              opacity: 0; 
              transform: scale(0.8) translateY(-20px); 
            }
            to { 
              opacity: 1; 
              transform: scale(1) translateY(0); 
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Alert;
