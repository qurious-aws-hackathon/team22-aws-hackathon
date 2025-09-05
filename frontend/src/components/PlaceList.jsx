import { getLevelText, getLevelClass } from '../services/api';

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
        실시간 혼잡도 기준 정렬
      </p>
      
      {places.map(place => (
        <div 
          key={place.id} 
          className="place-item"
          onClick={() => onPlaceClick(place)}
        >
          <h4>{place.name}</h4>
          <p>{place.category}</p>
          
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
