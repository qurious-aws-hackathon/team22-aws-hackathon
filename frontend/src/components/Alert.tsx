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
  const icon = type === 'success' ? '✅' : '❌';

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

  // 모달 스타일
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px'
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: '16px',
          color: '#333',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          {message}
        </div>
        <button
          onClick={onClose}
          style={{
            backgroundColor: bgColor,
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            minWidth: '80px'
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default Alert;
