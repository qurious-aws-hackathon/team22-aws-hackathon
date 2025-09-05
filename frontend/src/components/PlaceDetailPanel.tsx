import { type Spot } from '../api';
import { getScoreColor, getScoreText, getScoreEmoji } from '../utils';

interface PlaceDetailPanelProps {
  spot: Spot;
  onClose: () => void;
  position?: { x: number; y: number };
}

const PlaceDetailPanel: React.FC<PlaceDetailPanelProps> = ({ spot, onClose, position }) => {
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    width: '300px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: 600,
    overflow: 'hidden',
    ...(position ? {
      left: position.x - 150, // 패널 중앙이 핀 위치가 되도록
      top: position.y - 20,   // 핀 위쪽에 표시
      transform: 'none'
    } : {
      top: '20px',
      right: '20px'
    })
  };

  return (
    <div style={panelStyle}>
      <div className="place-detail-header">
        <h3>{spot.name}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="place-detail-content">
        <div className="score-section">
          <div 
            className="score-badge"
            style={{ backgroundColor: getScoreColor(spot.quiet_rating) }}
          >
            {getScoreEmoji(spot.quiet_rating)} {spot.quiet_rating}점
          </div>
          <p className="score-text">{getScoreText(spot.quiet_rating)}</p>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">👍 좋아요</span>
            <span className="info-value">{spot.like_count || 0}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">👎 싫어요</span>
            <span className="info-value">{spot.dislike_count || 0}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">🔊 소음도</span>
            <span className="info-value">{spot.noise_level}dB</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">⭐ 평점</span>
            <span className="info-value">{spot.rating}/5</span>
          </div>
        </div>

        {spot.description && (
          <div className="description">
            <p>{spot.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceDetailPanel;
