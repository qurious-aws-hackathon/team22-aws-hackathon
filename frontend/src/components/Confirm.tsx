import React from 'react';

interface ConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Confirm: React.FC<ConfirmProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '확인',
  cancelText = '취소'
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          backdropFilter: 'blur(2px)'
        }}
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '320px',
          maxWidth: '90vw',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid #e0e0e0',
          zIndex: 10001,
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
          color: 'white'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{title}</h3>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <p style={{ 
            margin: '0 0 24px 0', 
            fontSize: '14px', 
            color: '#555', 
            lineHeight: '1.5' 
          }}>
            {message}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              onClick={onCancel}
              style={{ 
                padding: '10px 20px', 
                border: '2px solid #e0e0e0', 
                borderRadius: '8px', 
                background: 'white',
                color: '#666',
                cursor: 'pointer', 
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#ccc';
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e0e0e0';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              style={{ 
                padding: '10px 20px', 
                border: 'none', 
                borderRadius: '8px', 
                background: '#ff4757',
                color: 'white',
                cursor: 'pointer', 
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#ff3742';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ff4757';
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Confirm;
