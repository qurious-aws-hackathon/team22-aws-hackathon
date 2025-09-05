import { type Spot } from '../api';
import { getScoreColor, getScoreText, getScoreEmoji } from '../utils';

interface PlaceDetailPanelProps {
  spot: Spot;
  onClose: () => void;
}

const PlaceDetailPanel: React.FC<PlaceDetailPanelProps> = ({ spot, onClose }) => {
  return (
    <div className="place-detail-panel">
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
