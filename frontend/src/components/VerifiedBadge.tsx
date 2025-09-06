import React from 'react';

interface VerifiedBadgeProps {
  size?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 'medium', style }) => {
  const sizeConfig = {
    small: { fontSize: '12px', padding: '2px 6px' },
    medium: { fontSize: '14px', padding: '4px 8px' },
    large: { fontSize: '16px', padding: '6px 10px' }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'linear-gradient(135deg, #4CAF50, #45a049)',
        color: 'white',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: sizeConfig[size].fontSize,
        padding: sizeConfig[size].padding,
        boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)',
        ...style
      }}
      title="실제 소음 측정 완료"
    >
      ✓ 실측
    </span>
  );
};

export default VerifiedBadge;
