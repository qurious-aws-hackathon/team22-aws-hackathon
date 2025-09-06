import { useEffect, useRef, useState } from 'react';
import { type Spot, api } from '../api';
import { type RouteState, type LatLng } from '../api/models/route';
import { kakaoDirectionsApi } from '../api/kakao-directions';
import { quietRouteApi } from '../api/quiet-route';
import PinRegistrationModal from './PinRegistrationModal';
import Alert from './Alert';
import PlacePopulation from './Map/PlacePopulation';
import { RealtimePopulationData } from '../api';
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
  console.log('🗺️ Map 컴포넌트 렌더링 - places 수:', places?.length || 0);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markersPlacesRef = useRef<Spot[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const crowdPolygonsRef = useRef<any[]>([]);
  const noiseCirclesRef = useRef<any[]>([]);
  const routeMarkersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const startPointRef = useRef<LatLng | null>(null);
  const endPointRef = useRef<LatLng | null>(null);
  const waypointsRef = useRef<LatLng[]>([]);
  const isRouteModeRef = useRef<boolean>(false);
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
  
  // 경로 상태 관리 (UI용)
  const [routeState, setRouteState] = useState<RouteState>({
    startPoint: null,
    endPoint: null,
    isRouteMode: false,
    recommendedRoute: null
  });
  const [nearbyQuietPlaces, setNearbyQuietPlaces] = useState<Spot[]>([]);
  const searchRadius = 1000; // 1km 고정

  useEffect(() => {
    // 거리 계산 함수 테스트
    testDistanceCalculation();
    
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

    }
  };

  const loadPopulationData = async () => {
    try {
      const response = await api.population.getRealtimePopulation();

      let populationArray = [];
      if (response && (response as any).data && Array.isArray((response as any).data)) {
        populationArray = (response as any).data;
      } else if (response && Array.isArray(response)) {
        populationArray = response;
      }

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

      // 현재 로그인한 사용자 정보 가져오기
      const currentUser = api.auth.getCurrentUser();

      overlayContent.innerHTML = `
        <div style="background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); border: 2px solid #667eea; width: 350px; padding: 16px; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; word-wrap: break-word; overflow-wrap: break-word;">장소 상세</h3>
            <button id="close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; flex-shrink: 0;">✕</button>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #333; word-wrap: break-word; overflow-wrap: break-word; flex: 1; min-width: 0;">${place.name}</h2>
            <button id="delete-btn" style="background: #ff4757; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; color: white; padding: 4px 8px; font-weight: 500; display: none; flex-shrink: 0;" title="장소 삭제">
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
          
          <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin-bottom: 16px; 
             word-break: break-all; 
             white-space: normal;">
            ${place.description}
           </div>
          
          <div>
            <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333;">댓글</h4>
            ${currentUser ? `
              <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                  👤 ${currentUser.nickname}
                </div>
                <div style="display: flex; gap: 8px;">
                  <input id="comment-input" type="text" placeholder="댓글을 입력하세요..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; min-width: 0; word-wrap: break-word;">
                  <button id="comment-btn" style="padding: 8px 16px; border: none; border-radius: 6px; background: #667eea; color: white; cursor: pointer; font-size: 14px; flex-shrink: 0;">등록</button>
                </div>
              </div>
            ` : `
              <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 14px; color: #666; margin-bottom: 12px;">
                댓글을 작성하려면 로그인이 필요합니다.
              </div>
            `}
            <div id="comments-list" style="border: 1px solid #eee; border-radius: 8px; max-height: 174px; overflow-y: auto; padding: 8px; font-size: 14px; color: #666;">
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
        const currentUser = api.auth.getCurrentUser();
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

      if (commentBtn && commentInput && currentUser) {
        const addComment = async () => {
          const comment = (commentInput as HTMLInputElement).value.trim();

          if (!comment) return;

            const requestData = {
              spot_id: place.id,
              content: comment,
              user_id: currentUser.id,
              nickname: currentUser.nickname
            };

            api.comments.createComment(requestData)
                .then(() => {
                  (commentInput as HTMLInputElement).value = '';
                  loadComments();
                }).catch(() => {
                  setAlert({isOpen: true, type: "error", message: '댓글 등록에 실패했습니다.'});
            });
        };

        commentBtn.onclick = addComment;
        (commentInput as HTMLInputElement).onkeypress = (e) => {
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
                <div style="margin-bottom: 6px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; min-height: 50px; word-wrap: break-word; overflow-wrap: break-word;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 600; font-size: 13px; word-wrap: break-word; overflow-wrap: break-word; flex: 1; min-width: 0;">${comment.nickname || '익명'}</span>
                    <span style="font-size: 12px; color: #999; flex-shrink: 0; margin-left: 8px;">${new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style="font-size: 14px; color: #555; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word;">${comment.content}</div>
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
        clearRoute();
        const startPoint = { lat, lng };
        startPointRef.current = startPoint;
        isRouteModeRef.current = true;
        setRouteState(prev => ({
          ...prev,
          startPoint,
          isRouteMode: true
        }));
        addRouteMarker(lat, lng, 'start');
        console.log('출발지 설정:', startPoint);
        showAlert('success', '🚀 출발지가 설정되었습니다. 도착지를 선택해주세요.');
        break;
      case 'end':
        if (!startPointRef.current) {
          alert('먼저 출발지를 설정해주세요.');
          break;
        }
        const endPoint = { lat, lng };
        endPointRef.current = endPoint;
        setRouteState(prev => ({
          ...prev,
          endPoint
        }));
        addRouteMarker(lat, lng, 'end');
        console.log('도착지 설정:', endPoint);
        console.log('🤫 조용한 경로 탐색 시작:', startPointRef.current, '→', endPoint);
        drawQuietRoute(startPointRef.current, endPoint, waypointsRef.current);
        break;
      case 'clear-route':
        clearRoute();
        break;
      case 'waypoint':
        if (!startPointRef.current) {
          showAlert('error', '먼저 출발지를 설정해주세요.');
          break;
        }
        const waypoint = { lat, lng };
        waypointsRef.current.push(waypoint);
        addRouteMarker(lat, lng, 'waypoint');
        console.log('경유지 추가:', waypoint);
        showAlert('success', `📍 경유지 ${waypointsRef.current.length}이 추가되었습니다.`);
        break;
    }

    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // UTF-8 문자열을 Base64로 안전하게 인코딩하는 함수
  const utf8ToBase64 = (str: string) => {
    return btoa(unescape(encodeURIComponent(str)));
  };

  const addRouteMarker = (lat: number, lng: number, type: 'start' | 'end' | 'waypoint') => {
    if (!mapInstance.current) {
      console.error('지도 인스턴스가 없습니다');
      return;
    }

    console.log(`${type} 마커 추가 중:`, lat, lng);

    const position = new (window as any).kakao.maps.LatLng(lat, lng);
    
    let markerSvg = '';
    
    switch (type) {
      case 'start':
        markerSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <linearGradient id="startGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#66BB6A;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2E7D32;stop-opacity:1" />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <path d="M24 0C15.163 0 8 7.163 8 16c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" 
                  fill="url(#startGradient)" filter="url(#shadow)"/>
            <circle cx="24" cy="16" r="10" fill="white"/>
            <path d="M19 16l4-4 4 4-4 4z" fill="#2E7D32"/>
            <text x="24" y="52" text-anchor="middle" font-size="10" fill="#2E7D32" font-weight="bold">출발지</text>
          </svg>
        `;
        break;
      case 'end':
        markerSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <linearGradient id="endGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#EF5350;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#C62828;stop-opacity:1" />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <path d="M24 0C15.163 0 8 7.163 8 16c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" 
                  fill="url(#endGradient)" filter="url(#shadow)"/>
            <circle cx="24" cy="16" r="10" fill="white"/>
            <rect x="20" y="12" width="8" height="8" fill="#C62828"/>
            <text x="24" y="52" text-anchor="middle" font-size="10" fill="#C62828" font-weight="bold">도착지</text>
          </svg>
        `;
        break;
      case 'waypoint':
        const waypointNumber = waypointsRef.current.length;
        markerSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <linearGradient id="waypointGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#FFA726;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#E65100;stop-opacity:1" />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <path d="M24 0C15.163 0 8 7.163 8 16c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" 
                  fill="url(#waypointGradient)" filter="url(#shadow)"/>
            <circle cx="24" cy="16" r="10" fill="white"/>
            <text x="24" y="21" text-anchor="middle" font-size="12" fill="#E65100" font-weight="bold">${waypointNumber}</text>
            <text x="24" y="52" text-anchor="middle" font-size="10" fill="#E65100" font-weight="bold">경유지</text>
          </svg>
        `;
        break;
    }
    
    const imageSrc = 'data:image/svg+xml;base64,' + utf8ToBase64(markerSvg);
    
    const imageSize = new (window as any).kakao.maps.Size(48, 60);
    const markerImage = new (window as any).kakao.maps.MarkerImage(imageSrc, imageSize);
    
    const marker = new (window as any).kakao.maps.Marker({
      position,
      image: markerImage,
      map: mapInstance.current
    });
    
    routeMarkersRef.current.push(marker);
    console.log(`${type} 마커 추가 완료. 총 경로 마커 수:`, routeMarkersRef.current.length);
  };

  const clearRoute = () => {
    console.log('경로 초기화 시작');
    
    // 경로 마커들 제거 (안전성 체크)
    if (routeMarkersRef.current && routeMarkersRef.current.length > 0) {
      routeMarkersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      routeMarkersRef.current = [];
    }
    
    // 경로 폴리라인 제거
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    
    // 상태 초기화
    startPointRef.current = null;
    endPointRef.current = null;
    waypointsRef.current = [];
    isRouteModeRef.current = false;
    
    setRouteState({
      startPoint: null,
      endPoint: null,
      isRouteMode: false,
      recommendedRoute: null
    });
    
    // 주변 조용한 장소 목록 초기화
    setNearbyQuietPlaces([]);
    
    // 마커 강조 표시 초기화
    try {
      resetMarkerHighlights();
    } catch (error) {
      console.warn('마커 강조 표시 초기화 실패:', error);
    }
    
    console.log('경로 초기화 완료');
  };

  // 마커 강조 표시 초기화
  const resetMarkerHighlights = () => {
    if (!markersRef.current || !Array.isArray(markersRef.current)) {
      console.warn('마커 배열이 초기화되지 않음');
      return;
    }

    markersRef.current.forEach((marker, index) => {
      try {
        const place = markersPlacesRef.current?.[index];
        if (place && marker && marker.setImage) {
          // 기존 createMarkerIcon 함수로 원래 디자인 복원
          const originalIcon = createMarkerIcon(place.category || '기타');
          marker.setImage(originalIcon);
        }
      } catch (error) {
        console.warn(`마커 ${index} 초기화 실패:`, error);
      }
    });
  };

  const drawQuietRoute = async (start: LatLng, end: LatLng, waypoints: LatLng[] = []) => {
    try {
      console.log('🤫 조용한 경로 탐색 중...', start, waypoints.length > 0 ? `→ ${waypoints.length}개 경유지 →` : '→', end);
      
      // 조용한 경로 API로 최적화된 경로 가져오기 (경유지 포함)
      const routeData = await quietRouteApi.findQuietRoute(start, end, {
        preferQuiet: true,
        avoidCrowded: true,
        maxDetour: 500
      }, waypoints);
      
      console.log('📍 조용한 경로 데이터:', routeData);
      
      // 경로 좌표들을 카카오맵 LatLng 객체로 변환
      const linePath = routeData.points.map(point => 
        new (window as any).kakao.maps.LatLng(point.lat, point.lng)
      );
      
      // 조용함 점수에 따른 색상 결정
      const quietnessScore = routeData.quietness_score || 0.7;
      const routeColor = quietnessScore > 0.8 ? '#4CAF50' : // 매우 조용함 - 녹색
                        quietnessScore > 0.6 ? '#8BC34A' : // 조용함 - 연녹색  
                        quietnessScore > 0.4 ? '#FFC107' : // 보통 - 노란색
                        '#FF9800'; // 시끄러움 - 주황색
      
      // 폴리라인으로 경로 그리기
      const polyline = new (window as any).kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 6,
        strokeColor: routeColor,
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
      });
      
      polyline.setMap(mapInstance.current);
      routePolylineRef.current = polyline;
      
      // 경로 정보 표시
      const distanceKm = (routeData.distance / 1000).toFixed(1);
      const durationMin = Math.ceil(routeData.duration / 60);
      const quietnessPercent = Math.round(quietnessScore * 100);
      
      console.log(`✅ 조용한 경로 완료: ${distanceKm}km, 약 ${durationMin}분, 조용함 ${quietnessPercent}%`);
      
      // 경로 상태 업데이트
      setRouteState(prev => ({
        ...prev,
        recommendedRoute: {
          id: `route_${Date.now()}`,
          distance: routeData.distance,
          duration: routeData.duration,
          points: routeData.points,
          quietness_score: quietnessScore,
          estimated_time: routeData.duration,
          congestion_levels: []
        }
      }));
      
      // 경로 주변 조용한 장소 찾기
      console.log('📍 경로 데이터 확인:', {
        points: routeData.points?.length || 0,
        places: places?.length || 0,
        searchRadius
      });
      
      const nearbyPlaces = findNearbyQuietPlaces(routeData.points, places, searchRadius);
      setNearbyQuietPlaces(nearbyPlaces);
      
      console.log('🎯 주변 장소 설정 완료:', nearbyPlaces.length);
      
      // 마커 강조 표시 (애니메이션 포함)
      if (nearbyPlaces.length > 0) {
        console.log('🎬 애니메이션 시작');
        highlightNearbyPlaces(nearbyPlaces);
      } else {
        console.log('❌ 주변 장소가 없어 애니메이션 생략');
      }
      
      // 사용자에게 경로 정보 알림
      const nearbyCount = nearbyPlaces.length;
      const radiusKm = (searchRadius / 1000).toFixed(1);
      showAlert('success', `🤫 조용한 경로 찾기 완료!\n거리: ${distanceKm}km, 시간: ${durationMin}분\n조용함 지수: ${quietnessPercent}%\n🏞️ 반경 ${radiusKm}km 내 조용한 장소: ${nearbyCount}개`);
      
    } catch (error) {
      console.error('❌ 조용한 경로 탐색 실패:', error);
      
      // 실패 시 기본 카카오 경로로 폴백
      try {
        const fallbackRoute = await kakaoDirectionsApi.getWalkingRoute(start, end);
        const linePath = fallbackRoute.points.map(point => 
          new (window as any).kakao.maps.LatLng(point.lat, point.lng)
        );
        
        const polyline = new (window as any).kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 4,
          strokeColor: '#FF9800',
          strokeOpacity: 0.6,
          strokeStyle: 'shortdash'
        });
        
        polyline.setMap(mapInstance.current);
        routePolylineRef.current = polyline;
        
        showAlert('error', '조용한 경로를 찾을 수 없어 일반 경로를 표시합니다.');
        
      } catch (fallbackError) {
        console.error('폴백 경로도 실패:', fallbackError);
        showAlert('error', '경로를 찾을 수 없습니다. 다시 시도해주세요.');
      }
    }
  };

  // 경로 주변 조용한 장소 찾기
  const findNearbyQuietPlaces = (routePoints: LatLng[], allPlaces: Spot[], maxDistance: number): Spot[] => {
    console.log('🔍 경로 주변 장소 찾기 시작:');
    console.log('- 경로 포인트 수:', routePoints?.length || 0);
    console.log('- 전체 장소 수:', allPlaces?.length || 0);
    console.log('- 최대 거리:', maxDistance, 'm');
    
    if (!routePoints || !allPlaces || routePoints.length === 0 || allPlaces.length === 0) {
      console.warn('❌ 경로 포인트 또는 장소 데이터가 없습니다');
      return [];
    }
    
    const nearbyPlaces: Spot[] = [];
    
    allPlaces.forEach((place, index) => {
      // API 응답에서 lat, lng 필드 사용 (latitude, longitude가 아님)
      const placePoint = { 
        lat: place.lat, 
        lng: place.lng 
      };
      
      console.log(`장소 ${index + 1}: ${place.name} (${placePoint.lat}, ${placePoint.lng})`);
      
      if (!placePoint.lat || !placePoint.lng) {
        console.warn(`❌ 장소 ${place.name}의 좌표가 없습니다`);
        return;
      }
      
      // 경로의 각 점과 장소 사이의 거리 계산
      const distances = routePoints.map(routePoint => {
        const distance = calculateDistance(routePoint, placePoint);
        return distance;
      });
      
      const minDistance = Math.min(...distances);
      console.log(`- 최단 거리: ${(minDistance / 1000).toFixed(2)}km`);
      
      if (minDistance <= maxDistance) {
        nearbyPlaces.push(place);
        console.log(`✅ 포함됨: ${place.name}`);
      } else {
        console.log(`❌ 제외됨: ${place.name} (거리: ${(minDistance / 1000).toFixed(2)}km > ${(maxDistance / 1000).toFixed(1)}km)`);
      }
    });
    
    console.log(`🏞️ 경로 주변 ${maxDistance/1000}km 이내 조용한 장소: ${nearbyPlaces.length}개`);
    console.log('찾은 장소들:', nearbyPlaces.map(p => p.name));
    return nearbyPlaces;
  };

  // 거리 계산 함수 테스트
  const testDistanceCalculation = () => {
    // 서울 시청 (37.5665, 126.9780)과 강남역 (37.4979, 127.0276) 사이 거리
    // 실제 거리: 약 9.6km
    const point1 = { lat: 37.5665, lng: 126.9780 };
    const point2 = { lat: 37.4979, lng: 127.0276 };
    const distance = calculateDistance(point1, point2);
    console.log(`🧪 거리 계산 테스트: 서울시청 ↔ 강남역 = ${(distance / 1000).toFixed(2)}km (예상: ~9.6km)`);
    
    // 3km 테스트: 서울시청에서 3km 반경
    const point3 = { lat: 37.5665 + 0.027, lng: 126.9780 }; // 약 3km 북쪽
    const distance3km = calculateDistance(point1, point3);
    console.log(`🧪 3km 테스트: ${(distance3km / 1000).toFixed(2)}km (예상: ~3km)`);
  };

  // 주변 조용한 장소 마커 강조 (애니메이션 포함)
  const highlightNearbyPlaces = (nearbyPlaces: Spot[]) => {
    if (!markersRef.current || !Array.isArray(markersRef.current)) {
      console.warn('마커 배열이 초기화되지 않음');
      return;
    }

    markersRef.current.forEach((marker, index) => {
      try {
        const place = markersPlacesRef.current?.[index];
        const isNearby = nearbyPlaces.some(nearbyPlace => nearbyPlace.id === place?.id);
        
        if (isNearby && marker && marker.setImage) {
          // 애니메이션 강조 마커 생성
          animateMarker(marker, index);
        }
      } catch (error) {
        console.warn(`마커 ${index} 강조 표시 실패:`, error);
      }
    });
  };

  // 마커 강조 효과 - 기존 물방울 디자인에 빨간색 테두리
  const animateMarker = (marker: any, index: number) => {
    const originalPlace = markersPlacesRef.current[index];
    if (!originalPlace) return;
    
    // 기존 물방울 디자인에 빨간색 테두리 추가
    const categoryConfig = {
      '카페': { emoji: '☕', color: '#FF6B9D' },
      '도서관': { emoji: '📚', color: '#4ECDC4' },
      '공원': { emoji: '🌳', color: '#45B7D1' },
      '기타': { emoji: '📍', color: '#96CEB4' }
    };
    
    const config = categoryConfig[originalPlace.category as keyof typeof categoryConfig] || categoryConfig['기타'];
    
    const highlightSvg = `
      <svg width="60" height="75" viewBox="0 0 60 75" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow${index}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <path d="M30 5C16.193 5 5 16.193 5 30c0 22.5 25 40 25 40s25-17.5 25-40C55 16.193 43.807 5 30 5z" 
              fill="${config.color}" 
              stroke="#FF0000" 
              stroke-width="3"
              filter="url(#shadow${index})"/>
        <circle cx="30" cy="30" r="18" fill="white" opacity="0.9"/>
        <text x="30" y="38" text-anchor="middle" font-size="24" fill="${config.color}">${config.emoji}</text>
      </svg>
    `;
    
    const highlightImageSrc = 'data:image/svg+xml;base64,' + utf8ToBase64(highlightSvg);
    const imageSize = new (window as any).kakao.maps.Size(60, 75);
    const highlightImage = new (window as any).kakao.maps.MarkerImage(
      highlightImageSrc, 
      imageSize,
      {
        offset: new (window as any).kakao.maps.Point(30, 75)
      }
    );
    
    marker.setImage(highlightImage);
  };

  // 거리 계산 함수
  const calculateDistance = (point1: LatLng, point2: LatLng): number => {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
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

        const currentUser = api.auth.getCurrentUser();
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


        // API 호출 - 실제 네트워크 요청
        const response = await api.spots.createSpot(spotData);

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
            onClick={() => handleContextMenuAction('end')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🏁 도착지
          </div>
          
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => handleContextMenuAction('clear-route')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🗑️ 경로 지우기
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
      
      {/* 주변 조용한 장소 목록 */}
      {nearbyQuietPlaces.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '16px',
            maxWidth: '320px',
            maxHeight: '500px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ 
              margin: '0', 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: '#2E7D32',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🤫 경로 주변 조용한 장소 (1km 이내)
              <span style={{
                background: '#4CAF50',
                color: 'white',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '12px'
              }}>
                {nearbyQuietPlaces.length}개
              </span>
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {nearbyQuietPlaces.map((place, index) => {
              // 경로와의 최단 거리 계산
              const minDistance = routeState.recommendedRoute?.points ? 
                Math.min(...routeState.recommendedRoute.points.map(routePoint => 
                  calculateDistance(routePoint, { 
                    lat: place.lat, 
                    lng: place.lng 
                  })
                )) : 0;
              
              return (
                <div
                  key={place.id}
                  style={{
                    padding: '12px',
                    background: '#F1F8E9',
                    borderRadius: '8px',
                    border: '1px solid #C8E6C9',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onClick={() => moveToSpot(place)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E8F5E8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F1F8E9';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#2E7D32'
                    }}>
                      {place.name}
                    </div>
                    <div style={{
                      background: '#4CAF50',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {(minDistance / 1000).toFixed(1)}km
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#558B2F',
                    marginBottom: '6px',
                    lineHeight: '1.3'
                  }}>
                    {place.description}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: '#689F38'
                  }}>
                    <span>👍 {place.like_count || 0}</span>
                    <span>📍 클릭하여 이동</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: '#E8F5E8',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#558B2F',
            textAlign: 'center'
          }}>
            💡 경로에서 1km 이내의 조용한 장소들입니다
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
