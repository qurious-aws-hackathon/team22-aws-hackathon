import { getLevelText, getLevelClass, getScoreText, getScoreColor, getScoreEmoji } from '../services/api';

const PlaceList = ({ places, onPlaceClick }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div>
      <h3>🤫 조용한 장소 목록</h3>
      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
        조용함 지수 기준 정렬
      </p>
      
      {places.map(place => (
        <div 
          key={place.id} 
          className="place-item"
          onClick={() => onPlaceClick(place)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, flex: 1 }}>{place.name}</h4>
            <div style={{ 
              background: getScoreColor(place.quietScore),
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              minWidth: '50px',
              textAlign: 'center'
            }}>
              {getScoreEmoji(place.quietScore)} {place.quietScore}점
            </div>
          </div>
          
          <p style={{ margin: '4px 0', color: '#666', fontSize: '0.9rem' }}>
            {place.category} • {getScoreText(place.quietScore)}
          </p>
          
          <div style={{ marginTop: '0.5rem' }}>
            <span className={`noise-level ${getLevelClass(place.noiseLevel, 'noise')}`}>
              소음: {getLevelText(place.noiseLevel)}
            </span>
            <span className={`crowd-level ${getLevelClass(place.crowdLevel, 'crowd')}`}>
              혼잡: {getLevelText(place.crowdLevel)}
            </span>
          </div>
          
          {place.population && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
              <div>👥 현재 인구: {place.population.toLocaleString()}명</div>
              {place.lastUpdated && (
                <div>📍 {formatTime(place.lastUpdated)} 업데이트</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PlaceList;
