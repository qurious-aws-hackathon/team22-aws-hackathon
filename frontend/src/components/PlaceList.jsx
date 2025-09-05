import { getLevelText, getLevelClass } from '../services/api';

const PlaceList = ({ places, onPlaceClick }) => {
  return (
    <div>
      <h3>조용한 장소 목록</h3>
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
        </div>
      ))}
    </div>
  );
};

export default PlaceList;
