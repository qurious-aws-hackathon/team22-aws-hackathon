import { type Spot } from '../api';
import { getScoreColor, getScoreText } from '../utils';

interface FloatingPlaceListProps {
  places: Spot[];
  onPlaceClick: (place: Spot) => void;
}

const FloatingPlaceList: React.FC<FloatingPlaceListProps> = ({ places, onPlaceClick }) => {
  return (
    <div className="floating-place-list">
      <div className="floating-header">
        <h3>🌟 조용한 장소 추천</h3>
        <span className="place-count">{places.length}곳</span>
      </div>
      
      <div className="place-items">
        {places.slice(0, 10).map(place => (
          <div 
            key={place.id} 
            className="floating-place-item"
            onClick={() => onPlaceClick(place)}
          >
            <div className="place-info">
              <div className="place-name">{place.name}</div>
              <div className="place-category">{place.category}</div>
            </div>
            
            <div className="place-score">
              <div 
                className="score-badge"
                style={{ backgroundColor: getScoreColor(place.quiet_rating) }}
              >
                {place.quiet_rating}
              </div>
              <div className="score-text">{getScoreText(place.quiet_rating)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloatingPlaceList;
