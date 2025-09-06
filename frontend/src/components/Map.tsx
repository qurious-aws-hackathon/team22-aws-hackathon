import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Spot, api } from '../api';
import { useMapInstance } from './Map/hooks/useMapInstance';
import { useMarkerManager } from './Map/hooks/useMarkerManager';
import { useRouteManager } from './Map/hooks/useRouteManager';
import { usePopulationOverlay } from './Map/hooks/usePopulationOverlay';
import { useContextMenu } from './Map/hooks/useContextMenu';
import { useLocationManager } from './Map/hooks/useLocationManager';
import { useMapData } from './Map/hooks/useMapData';
import PinRegistrationModal from './PinRegistrationModal';
import Alert from './Alert';
import PlacePopulation from './Map/PlacePopulation';
import PlaceDetailPopup from './PlaceDetailPopup';
import { useLoading } from '../contexts/LoadingContext';

interface MapProps {
  places: Spot[];
  onPlaceClick?: (place: Spot) => void;
  selectedSpot?: Spot | null;
  onSpotsUpdate?: () => void;
  onSpotDelete?: (spotId: string) => void;
}

const Map: React.FC<MapProps> = React.memo(({
  places,
  onPlaceClick,
  selectedSpot,
  onSpotsUpdate,
  onSpotDelete
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [showCongestion, setShowCongestion] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalData, setPinModalData] = useState({ lat: 0, lng: 0 });
  const [nearbyQuietPlaces, setNearbyQuietPlaces] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    message: ''
  });

  const { withLoading } = useLoading();

  // Initialize map instance
  const mapOptions = useMemo(() => ({
    center: { lat: 37.5665, lng: 126.9780 },
    level: 8
  }), []);

  const {
    mapInstance,
    initializeMap,
    panTo,
    setLevel,
    relayout
  } = useMapInstance(mapRef);

  // Initialize data management
  const {
    populationData,
    loadPopulationData
  } = useMapData();

  // Alert management
  const showAlert = useCallback((type: 'success' | 'error', message: string) => {
    setAlert({ isOpen: true, type, message });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, []);

  const routeCallbacks = useMemo(() => ({
    onAlert: showAlert
  }), [showAlert]);

  const {
    updateMarkers,
    highlightMarkers
  } = useMarkerManager(mapInstance);

  const {
    routeState,
    setStartPoint,
    setEndPoint,
    addWaypoint,
    clearRoute,
    findNearbyQuietPlaces
  } = useRouteManager(mapInstance, routeCallbacks);

  const {
    updateOverlays
  } = usePopulationOverlay(mapInstance);

  const {
    moveToCurrentLocation,
    isLocating
  } = useLocationManager(mapInstance);

  // Context menu actions
  const contextMenuActions = useMemo(() => ({
    onRegisterPin: (lat: number, lng: number) => {
      setPinModalData({ lat, lng });
      setShowPinModal(true);
    },
    onSetStartPoint: setStartPoint,
    onSetEndPoint: setEndPoint,
    onAddWaypoint: addWaypoint,
    onClearRoute: clearRoute
  }), [setStartPoint, setEndPoint, addWaypoint, clearRoute]);

  const { contextMenu, handleContextMenuAction } = useContextMenu(
    mapRef,
    mapInstance,
    contextMenuActions
  );

  // Optimized marker click handler
  const handleMarkerClick = useCallback((place: Spot) => {
    // 마커 위치로 이동하고 줌 레벨 3으로 설정
    panTo(place.lat, place.lng);
    setTimeout(() => setLevel(3), 300);

    setSelectedSpotId(place.id);
    setIsModalOpen(true);
    onPlaceClick?.(place);
  }, [panTo, setLevel, onPlaceClick]);

  // Optimized spot movement
  const moveToSpot = useCallback((spot: Spot) => {
    const currentLevel = mapInstance?.getLevel() || 8;
    const targetLevel = 3;

    if (currentLevel > 5) {
      panTo(spot.lat, spot.lng);
      setTimeout(() => setLevel(targetLevel), 300);
    } else {
      panTo(spot.lat, spot.lng);
      setTimeout(() => {
        if (mapInstance?.getLevel() !== targetLevel) {
          setLevel(targetLevel);
        }
      }, 300);
    }

    setTimeout(() => relayout(), 100);
  }, [mapInstance, panTo, setLevel, relayout]);

  // Pin registration handler
  const handlePinRegistration = useCallback(async (data: {
    name: string;
    description: string;
    category: string;
    noiseLevel: number;
    rating: number;
    image_url?: string;
    isNoiseRecorded: boolean;
  }) => {
    try {
      await withLoading(async () => {
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
          user_id: currentUser ? currentUser.id : 'anonymous',
          image_url: data.image_url || undefined
        };

        return await api.spots.createSpot(spotData);
      }, '쉿플레이스 등록 중...');

      setShowPinModal(false);
      onSpotsUpdate?.();
      showAlert('success', '새로운 쉿플레이스가 성공적으로 등록되었습니다!');
    } catch (error) {
      console.error('스팟 등록 실패:', error);
      showAlert('error', '스팟 등록에 실패했습니다. 다시 시도해주세요.');
    }
  }, [pinModalData, withLoading, onSpotsUpdate, showAlert]);

  // Initialize map
  useEffect(() => {
    // @ts-ignore
    if (mapRef.current && window.kakao?.maps) {
      initializeMap(mapOptions);
      setTimeout(() => loadPopulationData(), 1000);
    }
  }, [initializeMap, mapOptions, loadPopulationData, places.length, populationData.length]);

  // Update markers when places change
  useEffect(() => {
    if (mapInstance && places.length > 0) {
      updateMarkers(places, handleMarkerClick);
    }
  }, [mapInstance, places, updateMarkers, handleMarkerClick]);

  // Update population overlays
  useEffect(() => {
    if (mapInstance && populationData.length > 0) {
      updateOverlays(populationData, showCongestion);
    }
  }, [mapInstance, populationData, showCongestion, updateOverlays]);

  // Handle selected spot
  useEffect(() => {
    if (selectedSpot && mapInstance) {
      // 선택된 스팟 위치로 이동하고 줌 레벨 3으로 설정
      panTo(selectedSpot.lat, selectedSpot.lng);
      setTimeout(() => setLevel(3), 300);

      setSelectedSpotId(selectedSpot.id);
      setIsModalOpen(true);
    }
  }, [selectedSpot, mapInstance, panTo, setLevel]);

  // Update nearby places when route changes
  useEffect(() => {
    if (routeState.recommendedRoute?.points && places.length > 0) {
      const nearbyPlaces = findNearbyQuietPlaces(
        routeState.recommendedRoute.points,
        places,
        1000
      );
      setNearbyQuietPlaces(nearbyPlaces);

      if (nearbyPlaces.length > 0) {
        highlightMarkers(nearbyPlaces.map(p => p.id));
      }
    } else {
      setNearbyQuietPlaces([]);
    }
  }, [routeState.recommendedRoute, places, findNearbyQuietPlaces, highlightMarkers]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Context Menu */}
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
          {[
            { action: 'register', label: '📍 핀 등록' },
            { action: 'start', label: '🚀 출발지' },
            { action: 'waypoint', label: '🔄 경유지' },
            { action: 'end', label: '🏁 도착지' },
            { action: 'clear-route', label: '🗑️ 경로 지우기' }
          ].map(({ action, label }, index, array) => (
            <div
              key={action}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: index < array.length - 1 ? '1px solid #eee' : 'none',
                fontSize: '14px'
              }}
              onClick={() => handleContextMenuAction(action)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Current Location Button */}
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

      {/* Congestion Toggle */}
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

      {/* Nearby Quiet Places */}
      {nearbyQuietPlaces.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
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
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#2E7D32'
          }}>
            🤫 경로 주변 조용한 장소 ({nearbyQuietPlaces.length}개)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {nearbyQuietPlaces.map((place) => (
              <div
                key={place.id}
                style={{
                  padding: '12px',
                  background: '#F1F8E9',
                  borderRadius: '8px',
                  border: '1px solid #C8E6C9',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => moveToSpot(place)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E8F5E8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F1F8E9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2E7D32' }}>
                  {place.name}
                </div>
                <div style={{ fontSize: '12px', color: '#558B2F', marginTop: '4px' }}>
                  {place.description}
                </div>
                <div style={{ fontSize: '11px', color: '#689F38', marginTop: '4px' }}>
                  👍 {place.like_count || 0} • 📍 클릭하여 이동
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Place Detail Popup - 완전히 독립적인 모달 */}
      <PlaceDetailPopup
        spotId={selectedSpotId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSpotId(null);
        }}
        onSpotDelete={onSpotDelete}
        onAlert={showAlert}
      />

      {/* Modals and Overlays */}
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

      {showCongestion && (
        <PlacePopulation
          map={mapInstance}
          congestionData={populationData.map(data => ({
            lat: data.lat,
            lng: data.lng,
            population: data.population_max,
            noiseLevel: 0,
            congestLevel: data.congest_level,
            address: data.area_name,
            name: data.area_name
          }))}
        />
      )}
    </div>
  );
});

Map.displayName = 'Map';

export default Map;
