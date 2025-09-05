import { useEffect, useRef, useState } from 'react';
import { type Spot, api } from '../api';
import { authApi } from '../api/auth';
import PinRegistrationModal from './PinRegistrationModal';
import PlaceDetailPanel from './PlaceDetailPanel';
import Alert from './Alert';
import PlacePopulation from './Map/PlacePopulation';
import { RealtimePopulationData } from '../api/models/population';
import { useLoading } from '../contexts/LoadingContext';

interface MapProps {
  places: Spot[];
  onPlaceClick?: (place: Spot) => void;
  selectedSpot?: Spot | null;
  onSpotsUpdate?: () => void;
  onSpotDelete?: (spotId: string) => void;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  lat: number;
  lng: number;
}

const Map: React.FC<MapProps> = ({ places, onPlaceClick, selectedSpot, onSpotsUpdate, onSpotDelete }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markersPlacesRef = useRef<Spot[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const crowdPolygonsRef = useRef<any[]>([]);
  const noiseCirclesRef = useRef<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [populationData, setPopulationData] = useState<RealtimePopulationData[]>([]);
  const [showCongestion, setShowCongestion] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    lat: 0,
    lng: 0
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalData, setPinModalData] = useState({ lat: 0, lng: 0 });
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    message: ''
  });

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ isOpen: true, type, message });
  };

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  const { withLoading } = useLoading();

  useEffect(() => {
    initializeMap();
    // 지도 초기화 후 혼잡도 데이터 로드
    setTimeout(() => {
      loadPopulationData();
    }, 1000);
  }, []);

  useEffect(() => {
    if (mapInstance.current && places.length > 0) {
      updateMarkers();
    }
  }, [places]);

  useEffect(() => {
    if (mapInstance.current && populationData.length > 0) {
      if (showCongestion) {
        updateCrowdPolygons();
        updateNoiseCircles();
      } else {
        // 혼잡도 오버레이 제거
        crowdPolygonsRef.current.forEach(polygon => polygon.setMap(null));
        crowdPolygonsRef.current = [];
        noiseCirclesRef.current.forEach(circle => circle.setMap(null));
        noiseCirclesRef.current = [];
      }
    }
  }, [populationData, showCongestion]);

  useEffect(() => {
    if (selectedSpot && mapInstance.current) {
      // 해당 마커 찾기
      const markerIndex = markersPlacesRef.current.findIndex(p => p.id === selectedSpot.id);
      if (markerIndex !== -1 && markersRef.current[markerIndex]) {
        const targetMarker = markersRef.current[markerIndex];
        showInfoWindow(targetMarker, selectedSpot);
      }
    }
  }, [selectedSpot]);

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const initializeMap = () => {
    if (mapRef.current && (window as any).kakao?.maps) {
      const options = {
        center: new (window as any).kakao.maps.LatLng(37.5665, 126.9780),
        level: 8
      };
      
      mapInstance.current = new (window as any).kakao.maps.Map(mapRef.current, options);
      
      // 전역에서 접근 가능하도록 지도 인스턴스 노출
      (window as any).mapInstance = mapInstance.current;
      
      // Kakao Maps API 우클릭 이벤트
      (window as any).kakao.maps.event.addListener(mapInstance.current, 'rightclick', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        const lat = latlng.getLat();
        const lng = latlng.getLng();
        
        // 화면 좌표 계산 (메뉴 위치용)
        const rect = mapRef.current!.getBoundingClientRect();
        let screenX = rect.left + rect.width / 2;
        let screenY = rect.top + rect.height / 2;
        
        // 더 정확한 화면 좌표 계산
        try {
          const projection = mapInstance.current.getProjection();
          const mapCenter = mapInstance.current.getCenter();
          const mapCenterPixel = projection.pointFromCoords(mapCenter);
          const clickPixel = projection.pointFromCoords(latlng);
          
          const offsetX = clickPixel.x - mapCenterPixel.x;
          const offsetY = clickPixel.y - mapCenterPixel.y;
          
          screenX = rect.left + rect.width / 2 + offsetX;
          screenY = rect.top + rect.height / 2 + offsetY;
        } catch (error) {
          console.error('화면 좌표 계산 실패:', error);
        }
        
        setContextMenu({
          visible: true,
          x: screenX,
          y: screenY,
          lat,
          lng
        });
      });
      
      // 브라우저 기본 우클릭 메뉴 차단
      mapRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
      });
      
      // 지도 클릭 이벤트로 InfoWindow 닫기
      (window as any).kakao.maps.event.addListener(mapInstance.current, 'click', () => {
        // InfoWindow 닫기
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
          infoWindowRef.current = null;
        }
      });
    }
  };

  const loadPopulationData = async () => {
    try {
      console.log('혼잡도 데이터 로딩 시작...');
      const response = await api.population.getRealtimePopulation();
      
      let populationArray = [];
      if (response && (response as any).data && Array.isArray((response as any).data)) {
        populationArray = (response as any).data;
      } else if (response && Array.isArray(response)) {
        populationArray = response;
      }
      
      console.log('혼잡도 데이터 로딩 완료:', populationArray.length, '개');
      setPopulationData(populationArray);
      
    } catch (error) {
      console.error('실시간 인구밀도 데이터 로드 실패:', error);
      setPopulationData([]);
    }
  };

  const createMarkerIcon = (category: string) => {
    // 카테고리별 이모지 및 밝고 귀여운 색상 설정
    const categoryConfig = {
      '카페': { emoji: '☕', color: '#FF6B9D' },    // 핑크
      '도서관': { emoji: '📚', color: '#4ECDC4' },  // 민트
      '공원': { emoji: '🌳', color: '#45B7D1' },    // 하늘색
      '기타': { emoji: '📍', color: '#96CEB4' }     // 연두색
    };

    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig['기타'];
    
    // 더 큰 SVG 마커 생성 (60x75px)
    const svgContent = `
      <svg width="60" height="75" viewBox="0 0 60 75" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <path d="M30 5C16.193 5 5 16.193 5 30c0 22.5 25 40 25 40s25-17.5 25-40C55 16.193 43.807 5 30 5z" 
              fill="${config.color}" 
              stroke="white" 
              stroke-width="3"
              filter="url(#shadow)"/>
        <circle cx="30" cy="30" r="18" fill="white" opacity="0.9"/>
        <text x="30" y="38" text-anchor="middle" font-size="24" fill="${config.color}">${config.emoji}</text>
      </svg>
    `;

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new (window as any).kakao.maps.MarkerImage(
      svgUrl,
      new (window as any).kakao.maps.Size(60, 75),
      {
        offset: new (window as any).kakao.maps.Point(30, 75)
      }
    );
  };

  const showInfoWindow = (marker: any, place: Spot) => {
    // 기존 오버레이 제거 (중복 방지)
    if (infoWindowRef.current) {
      infoWindowRef.current.setMap(null);
      infoWindowRef.current = null;
    }

    // 이미 같은 장소의 팝업이 열려있다면 닫기만 하고 리턴
    if (infoWindowRef.current && infoWindowRef.current.placeId === place.id) {
      return;
    }

    // 지도 이동 (팝업이 중앙에 오도록 조정)
    const moveLatLng = new (window as any).kakao.maps.LatLng(place.lat, place.lng);
    
    // 팝업이 화면 중앙에 오도록 마커보다 위쪽으로 지도 중심 이동
    const projection = mapInstance.current.getProjection();
    const point = projection.pointFromCoords(moveLatLng);
    
    // 팝업 높이만큼 위쪽으로 이동 (약 150px)
    const adjustedPoint = new (window as any).kakao.maps.Point(point.x, point.y - 150);
    const adjustedLatLng = projection.coordsFromPoint(adjustedPoint);
    
    mapInstance.current.setCenter(adjustedLatLng);
    mapInstance.current.setLevel(3);

    // 오버레이 생성
    setTimeout(() => {
      // 다시 한번 중복 체크
      if (infoWindowRef.current) {
        infoWindowRef.current.setMap(null);
        infoWindowRef.current = null;
      }

      const overlayContent = document.createElement('div');
      overlayContent.innerHTML = `
        <div style="background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); border: 2px solid #667eea; width: 350px; padding: 16px; max-height: 400px; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">장소 상세</h3>
            <button id="close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">✕</button>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #333;">${place.name}</h2>
            <button id="delete-btn" style="background: #ff4757; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; color: white; padding: 4px 8px; font-weight: 500; display: none;" title="장소 삭제">
              삭제
            </button>
          </div>
          
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button id="like-btn" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 20px; background: white; cursor: pointer; font-size: 14px;">
              👍 ${place.like_count || 0}
            </button>
            <button id="dislike-btn" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 20px; background: white; cursor: pointer; font-size: 14px;">
              👎 ${place.dislike_count || 0}
            </button>
            <span style="padding: 8px 12px; background: #667eea; border-radius: 20px; color: white; font-size: 14px;">
              🔊 ${place.noise_level}dB ${place.is_noise_recorded ? '⭐' : ''}
            </span>
          </div>
          
          ${place.description ? `<div style="padding: 12px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin-bottom: 16px;">${place.description}</div>` : ''}
          
          <div>
            <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333;">댓글</h4>
            <div style="margin-bottom: 12px;">
              <input id="nickname-input" type="text" placeholder="닉네임" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 8px; box-sizing: border-box;">
              <div style="display: flex; gap: 8px;">
                <input id="comment-input" type="text" placeholder="댓글을 입력하세요..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                <button id="comment-btn" style="padding: 8px 16px; border: none; border-radius: 6px; background: #667eea; color: white; cursor: pointer; font-size: 14px;">등록</button>
              </div>
            </div>
            <div id="comments-list" style="border: 1px solid #eee; border-radius: 8px; max-height: 150px; overflow-y: auto; padding: 12px; font-size: 14px; color: #666;">
              댓글을 불러오는 중...
            </div>
          </div>
        </div>
      `;

      // 팝업 이벤트 전파 차단 (지도 조작 가능하게 함)
      overlayContent.addEventListener('mousedown', (e) => e.stopPropagation());
      overlayContent.addEventListener('mousemove', (e) => e.stopPropagation());
      overlayContent.addEventListener('mouseup', (e) => e.stopPropagation());
      overlayContent.addEventListener('click', (e) => e.stopPropagation());
      overlayContent.addEventListener('dblclick', (e) => e.stopPropagation());
      overlayContent.addEventListener('wheel', (e) => e.stopPropagation());

      // 팝업 내부 모든 요소에 이벤트 전파 차단 적용
      const allElements = overlayContent.querySelectorAll('*');
      allElements.forEach(element => {
        element.addEventListener('mousedown', (e) => e.stopPropagation());
        element.addEventListener('mousemove', (e) => e.stopPropagation());
        element.addEventListener('mouseup', (e) => e.stopPropagation());
        element.addEventListener('click', (e) => e.stopPropagation());
        element.addEventListener('dblclick', (e) => e.stopPropagation());
        element.addEventListener('wheel', (e) => e.stopPropagation());
        element.addEventListener('focus', (e) => e.stopPropagation());
        element.addEventListener('blur', (e) => e.stopPropagation());
      });

      const overlay = new (window as any).kakao.maps.CustomOverlay({
        content: overlayContent,
        position: new (window as any).kakao.maps.LatLng(place.lat, place.lng),
        yAnchor: 1.3, // 마커 아이콘 위에 표시
        xAnchor: 0.5
      });

      overlay.setMap(mapInstance.current);
      overlay.placeId = place.id; // 장소 ID 저장
      infoWindowRef.current = overlay;

      // 이벤트 리스너 등록
      const closeBtn = overlayContent.querySelector('#close-btn');
      const likeBtn = overlayContent.querySelector('#like-btn');
      const dislikeBtn = overlayContent.querySelector('#dislike-btn');
      const deleteBtn = overlayContent.querySelector('#delete-btn');
      const commentBtn = overlayContent.querySelector('#comment-btn');
      const commentInput = overlayContent.querySelector('#comment-input');
      const nicknameInput = overlayContent.querySelector('#nickname-input');

      if (closeBtn) {
        closeBtn.onclick = () => {
          overlay.setMap(null);
          infoWindowRef.current = null;
        };
      }

      if (likeBtn) {
        likeBtn.onclick = async () => {
          try {
            const response = await api.spots.likeSpot(place.id);
            likeBtn.innerHTML = `👍 ${response.likes}`;
            if (dislikeBtn) dislikeBtn.innerHTML = `👎 ${response.dislikes}`;
          } catch (error) {
            console.error('좋아요 실패:', error);
          }
        };
      }

      if (dislikeBtn) {
        dislikeBtn.onclick = async () => {
          try {
            const response = await api.spots.dislikeSpot(place.id);
            if (likeBtn) likeBtn.innerHTML = `👍 ${response.likes}`;
            dislikeBtn.innerHTML = `👎 ${response.dislikes}`;
          } catch (error) {
            console.error('싫어요 실패:', error);
          }
        };
      }

      if (deleteBtn) {
        const currentUser = authApi.getCurrentUser();
        const canDelete = currentUser && (place.user_id === currentUser.id || place.user_id === 'anonymous');
        
        if (canDelete) {
          deleteBtn.style.display = 'inline-block';
          deleteBtn.onclick = async () => {
            if (!confirm('정말로 이 장소를 삭제하시겠습니까?')) return;
            
            try {
              const result = await api.spots.deleteSpot(place.id);
              if (result.success) {
                window.alert('장소가 성공적으로 삭제되었습니다.');
                overlay.setMap(null);
                infoWindowRef.current = null;
                onSpotDelete?.(place.id);
                if (onSpotsUpdate) onSpotsUpdate();
              } else {
                window.alert(result.message || '장소 삭제에 실패했습니다.');
              }
            } catch (error) {
              console.error('장소 삭제 실패:', error);
              window.alert('장소 삭제에 실패했습니다.');
            }
          };
        }
      }

      if (commentBtn && commentInput && nicknameInput) {
        const addComment = async () => {
          const nickname = nicknameInput.value.trim();
          const comment = commentInput.value.trim();
          
          if (!nickname || !comment) return;
          
          try {
            await api.comments.createComment({
              spot_id: place.id,
              content: comment,
              nickname: nickname
            });
            commentInput.value = '';
            loadComments();
          } catch (error) {
            console.error('댓글 등록 실패:', error);
          }
        };

        commentBtn.onclick = addComment;
        commentInput.onkeypress = (e) => {
          if (e.key === 'Enter') addComment();
        };
      }

      // 댓글 로드
      const loadComments = async () => {
        try {
          const comments = await api.comments.getComments({ spot_id: place.id, limit: 5 });
          const commentsList = overlayContent.querySelector('#comments-list');
          
          if (commentsList) {
            if (comments.length === 0) {
              commentsList.innerHTML = '<div style="text-align: center; color: #999;">첫 번째 댓글을 남겨보세요!</div>';
            } else {
              commentsList.innerHTML = comments.map(comment => `
                <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 600; font-size: 13px;">${comment.nickname || '익명'}</span>
                    <span style="font-size: 12px; color: #999;">${new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style="font-size: 14px; color: #555;">${comment.content}</div>
                </div>
              `).join('');
            }
          }
        } catch (error) {
          console.error('댓글 로딩 실패:', error);
          const commentsList = overlayContent.querySelector('#comments-list');
          if (commentsList) {
            commentsList.innerHTML = '<div style="color: #999;">댓글을 불러올 수 없습니다.</div>';
          }
        }
      };

      loadComments();
    }, 500);
  };

  const showInfoWindowForPlace = (place: Spot) => {
    // 해당 장소의 마커 찾기
    const markerIndex = markersPlacesRef.current.findIndex(p => p.id === place.id);
    
    if (markerIndex !== -1 && markersRef.current[markerIndex]) {
      const targetMarker = markersRef.current[markerIndex];
      // InfoWindow 표시
      showInfoWindow(targetMarker, place);
    }
  };

  const moveToSpot = (spot: Spot) => {
    if (!mapInstance.current) return;

    const moveLatLng = new (window as any).kakao.maps.LatLng(spot.lat, spot.lng);
    
    mapInstance.current.setCenter(moveLatLng);
    mapInstance.current.setLevel(3);
    
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.relayout();
      }
    }, 100);
  };

  const getCrowdColor = (crowdLevel: number) => {
    // 자연스러운 색연필 색감
    if (crowdLevel >= 80) return '#FF6B6B';      // 연한 빨간색
    if (crowdLevel >= 60) return '#FFB347';      // 연한 주황색
    if (crowdLevel >= 40) return '#FFE66D';      // 연한 노란색
    if (crowdLevel >= 20) return '#95E1D3';      // 연한 민트색
    return '#A8E6CF';                            // 연한 녹색
  };

  const getNoiseColor = (noiseLevel: number) => {
    // 소음레벨용 자연스러운 색감
    if (noiseLevel >= 70) return '#FF8A95';      // 연한 분홍색
    if (noiseLevel >= 50) return '#FECA57';      // 연한 황금색
    if (noiseLevel >= 30) return '#48CAE4';      // 연한 하늘색
    return '#B8E6B8';                            // 연한 연두색
  };

  const createNaturalCircles = (latitude: number, longitude: number, color: string, intensity: number): any[] => {
    const circles: any[] = [];
    const center = new (window as any).kakao.maps.LatLng(latitude, longitude);
    
    // 다중 원형으로 자연스러운 그라데이션 효과 생성
    const layers = [
      { radius: 100, opacity: Math.min(0.6, intensity / 100 * 0.6) },
      { radius: 200, opacity: Math.min(0.4, intensity / 100 * 0.4) },
      { radius: 300, opacity: Math.min(0.2, intensity / 100 * 0.2) },
      { radius: 400, opacity: Math.min(0.1, intensity / 100 * 0.1) }
    ];
    
    layers.forEach(layer => {
      const circle = new (window as any).kakao.maps.Circle({
        center: center,
        radius: layer.radius,
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: layer.opacity
      });
      
      circle.setMap(mapInstance.current);
      circles.push(circle);
    });
    
    return circles;
  };

  const updateCrowdPolygons = () => {
    // 기존 폴리곤 제거
    crowdPolygonsRef.current.forEach(polygon => polygon.setMap(null));
    crowdPolygonsRef.current = [];

    if (!mapInstance.current || !populationData.length) return;

    populationData.forEach((data: any) => {
      const latitude = data.lat;
      const longitude = data.lng;
      
      if (!latitude || !longitude) {
        console.warn('위도/경도 정보가 없습니다:', data);
        return;
      }

      const crowdLevel = data.crowdLevel || data.crowd_level || 50;
      const color = getCrowdColor(crowdLevel);
      
      // 호버용 투명 원형 영역
      const hoverCircle = new (window as any).kakao.maps.Circle({
        center: new (window as any).kakao.maps.LatLng(latitude, longitude),
        radius: 400,
        strokeWeight: 0,
        fillColor: 'transparent',
        fillOpacity: 0
      });

      hoverCircle.setMap(mapInstance.current);

      // 호버 이벤트
      (window as any).kakao.maps.event.addListener(hoverCircle, 'mouseover', () => {
        const content = `
          <div style="padding: 12px; font-size: 14px; background: white; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); border: 1px solid #ddd; max-width: 220px;">
            <strong style="color: #333;">📍 ${data.name || '위치정보'}</strong><br>
            <strong style="color: #333;">🚶 유동인구: ${data.population?.toLocaleString() || '정보없음'}명</strong><br>
            <strong style="color: #666;">📊 혼잡도: ${crowdLevel}%</strong><br>
            <div style="margin-top: 8px; padding: 4px 8px; background: ${color}20; border-radius: 4px; font-size: 12px;">
              ${crowdLevel >= 80 ? '🔴 매우 혼잡' : crowdLevel >= 60 ? '🟠 혼잡' : crowdLevel >= 40 ? '🟡 보통' : crowdLevel >= 20 ? '🟢 여유' : '🔵 한적'}
            </div>
          </div>
        `;
        
        const tempInfoWindow = new (window as any).kakao.maps.InfoWindow({
          content: content,
          removable: false
        });
        
        tempInfoWindow.open(mapInstance.current, new (window as any).kakao.maps.LatLng(latitude, longitude));
        
        (window as any).kakao.maps.event.addListener(hoverCircle, 'mouseout', () => {
          tempInfoWindow.close();
        });
      });

      crowdPolygonsRef.current.push(hoverCircle);
    });
  };

  const updateNoiseCircles = () => {
    // 기존 원형 제거
    noiseCirclesRef.current.forEach(circle => circle.setMap(null));
    noiseCirclesRef.current = [];

    if (!mapInstance.current || !populationData.length) return;

    populationData.forEach((data: any) => {
      const latitude = data.lat;
      const longitude = data.lng;
      
      if (!latitude || !longitude) {
        console.warn('위도/경도 정보가 없습니다:', data);
        return;
      }

      const noiseLevel = data.noiseLevel || data.noise_level || 40;
      const color = getNoiseColor(noiseLevel);
      
      // 소음레벨을 작은 다중 원형으로 표시
      const circles = createNaturalCircles(latitude, longitude, color, noiseLevel);
      
      // 소음레벨은 더 작은 크기로 조정
      circles.forEach((circle, index) => {
        const smallRadius = [60, 120, 180, 240][index]; // 더 작은 반경
        circle.setRadius(smallRadius);
      });
      
      circles.forEach(circle => noiseCirclesRef.current.push(circle));
    });
  };

  const updateMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    markersPlacesRef.current = [];

    places.forEach(place => {
      const position = new (window as any).kakao.maps.LatLng(place.lat, place.lng);
      const markerIcon = createMarkerIcon(place.category || '기타');
      
      const marker = new (window as any).kakao.maps.Marker({
        position,
        map: mapInstance.current,
        image: markerIcon
      });

      (window as any).kakao.maps.event.addListener(marker, 'click', () => {
        // InfoWindow 표시
        showInfoWindow(marker, place);
        
        // 지도 중심을 해당 위치로 이동
        moveToSpot(place);
        
        // 외부 콜백 호출
        onPlaceClick?.(place);
      });

      markersRef.current.push(marker);
      markersPlacesRef.current.push(place);
    });
  };

  const addCurrentLocationMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
    }

    const position = new (window as any).kakao.maps.LatLng(lat, lng);
    
    const imageSrc = 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `);
    
    const imageSize = new (window as any).kakao.maps.Size(32, 32);
    const markerImage = new (window as any).kakao.maps.MarkerImage(imageSrc, imageSize);
    
    currentLocationMarkerRef.current = new (window as any).kakao.maps.Marker({
      position,
      image: markerImage,
      map: mapInstance.current
    });
  };

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) {
      window.alert('위치 서비스를 지원하지 않는 브라우저입니다.');
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const moveLatLng = new (window as any).kakao.maps.LatLng(latitude, longitude);
        
        if (mapInstance.current) {
          mapInstance.current.setCenter(moveLatLng);
          mapInstance.current.setLevel(3);
          
          addCurrentLocationMarker(latitude, longitude);
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error('위치 정보를 가져올 수 없습니다:', error);
        window.alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleContextMenuAction = (action: string) => {
    const { lat, lng } = contextMenu;
    
    switch (action) {
      case 'register':
        setPinModalData({ lat, lng });
        setShowPinModal(true);
        break;
      case 'start':
        window.alert(`출발지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
      case 'waypoint':
        window.alert(`경유지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
      case 'destination':
        window.alert(`도착지로 설정: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
    }
    
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePinRegistration = async (data: {
    name: string;
    description: string;
    category: string;
    noiseLevel: number;
    rating: number;
    image?: File;
    isNoiseRecorded: boolean;
  }) => {
    try {
      await withLoading(async () => {
        // 조용함 점수 계산 (소음도 기반)
        const quietRating = Math.max(10, Math.min(100, 100 - (data.noiseLevel - 20) * 1.5));
        
        const currentUser = authApi.getCurrentUser();
        const spotData = {
          name: data.name,
          description: data.description,
          lat: pinModalData.lat,
          lng: pinModalData.lng,
          category: data.category,
          noise_level: data.noiseLevel,
          rating: data.rating,
          quiet_rating: Math.round(quietRating),
          is_noise_recorded: data.isNoiseRecorded,
          user_id: currentUser ? currentUser.id : 'anonymous'
        };

        console.log('API 호출 데이터:', spotData);
        
        // API 호출 - 실제 네트워크 요청
        const response = await api.spots.createSpot(spotData);
        console.log('API 응답:', response);
        
        return response;
      }, '쉿플레이스 등록 중...');
      
      // 성공 시 모달 닫기
      setShowPinModal(false);
      
      showAlert('success', `"${data.name}" 장소가 성공적으로 등록되었습니다!`);
      
      // 스팟 목록 새로고침
      if (onSpotsUpdate) {
        onSpotsUpdate();
      }
      
    } catch (error) {
      console.error('스팟 등록 실패:', error);
      showAlert('error', '스팟 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 2000,
            minWidth: '120px',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('register')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            📍 핀 등록
          </div>
          
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('start')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🚀 출발지
          </div>
          
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('waypoint')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🔄 경유지
          </div>
          
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('destination')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🏁 도착지
          </div>
        </div>
      )}
      
      <button
        onClick={moveToCurrentLocation}
        disabled={isLocating}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          cursor: isLocating ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          zIndex: 1000,
          opacity: isLocating ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
        title="내 위치로 이동"
      >
        {isLocating ? '⏳' : '📍'}
      </button>

      {/* Toggle Button */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowCongestion(!showCongestion)}
          style={{
            padding: '10px 15px',
            backgroundColor: showCongestion ? '#FF6B35' : '#fff',
            color: showCongestion ? '#fff' : '#333',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            minWidth: '100px'
          }}
        >
          실시간 혼잡도 {showCongestion ? 'ON' : 'OFF'}
        </button>
      </div>

      <PinRegistrationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        lat={pinModalData.lat}
        lng={pinModalData.lng}
        onAlert={showAlert}
        onSubmit={handlePinRegistration}
      />
      
      <Alert
        type={alert.type}
        message={alert.message}
        isOpen={alert.isOpen}
        onClose={closeAlert}
      />
      
      {/* Congestion Overlay */}
      {showCongestion && (
        <PlacePopulation 
          map={mapInstance.current} 
          congestionData={populationData.map(data => {
            console.log('혼잡도 데이터 매핑:', data);
            return {
              lat: data.lat,
              lng: data.lng,
              population: data.population_max,
              noiseLevel: 0,
              congestLevel: data.congest_level,
              address: data.area_name,
              name: data.area_name
            };
          })}
        />
      )}
    </div>
  );
};

export default Map;
