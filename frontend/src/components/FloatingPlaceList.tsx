import { useState, useMemo } from 'react';
import { type Spot } from '../api';
import { getScoreColor, getScoreText } from '../utils';

type FilterType = 'latest' | 'distance' | 'likes' | 'quiet';

interface FloatingPlaceListProps {
  places: Spot[];
  onPlaceClick: (place: Spot) => void;
  userLocation?: { lat: number; lng: number };
}

const FloatingPlaceList: React.FC<FloatingPlaceListProps> = ({ places, onPlaceClick, userLocation }) => {
  const [filter, setFilter] = useState<FilterType>('latest');

  // 거리 계산 함수
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 필터링된 장소 목록
  const filteredPlaces = useMemo(() => {
    const sorted = [...places];
    
    switch (filter) {
      case 'latest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      case 'distance':
        if (!userLocation) return sorted;
        return sorted.sort((a, b) => {
          const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
          const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
          return distA - distB;
        });
      
      case 'likes':
        return sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
      
      case 'quiet':
        return sorted.sort((a, b) => a.noise_level - b.noise_level);
      
      default:
        return sorted;
    }
  }, [places, filter, userLocation]);

  if (places.length === 0) {
    return (
      <div className="floating-place-list">
        <div className="floating-header">
          <h3>🌟 조용한 장소 추천</h3>
          <span className="place-count">0곳</span>
        </div>
        <div className="place-items">
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#666',
            fontSize: '14px'
          }}>
            등록된 장소가 없습니다.<br/>
            지도에서 우클릭하여 새로운 장소를 등록해보세요!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="floating-place-list">
      <div className="floating-header">
        <h3>🌟 조용한 장소 추천</h3>
        <span className="place-count">{places.length}곳</span>
      </div>
      
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'latest' ? 'active' : ''}`}
          onClick={() => setFilter('latest')}
        >
          최신순
        </button>
        <button 
          className={`filter-tab ${filter === 'distance' ? 'active' : ''}`}
          onClick={() => setFilter('distance')}
          disabled={!userLocation}
        >
          거리순
        </button>
        <button 
          className={`filter-tab ${filter === 'likes' ? 'active' : ''}`}
          onClick={() => setFilter('likes')}
        >
          좋아요순
        </button>
        <button 
          className={`filter-tab ${filter === 'quiet' ? 'active' : ''}`}
          onClick={() => setFilter('quiet')}
        >
          소음 적은순
        </button>
      </div>
      
      <div className="place-items">
        {filteredPlaces.slice(0, 15).map(place => (
          <div 
            key={place.id} 
            className="floating-place-item"
            onClick={() => onPlaceClick(place)}
          >
            <div className="place-info">
              <div className="place-name">{place.name}</div>
              <div className="place-category">{place.category}</div>
              <div className="place-details">
                <span className="noise-level">🔊 {place.noise_level}dB</span>
                <span className="likes">👍 {place.like_count || 0}</span>
                <span className="dislikes">👎 {place.dislike_count || 0}</span>
                <div className="badges">
                  {place.is_noise_recorded && <span className="live-badge">🎤</span>}
                  {place.image_url && <span className="has-photo">📷</span>}
                </div>
              </div>
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
