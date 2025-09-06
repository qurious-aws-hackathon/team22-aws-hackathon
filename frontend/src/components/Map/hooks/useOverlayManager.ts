import { useCallback } from 'react';

interface OverlayCallbacks {
  onSpotClick?: (spot: any) => void;
}

export const useOverlayManager = (mapInstance: any, callbacks: OverlayCallbacks) => {
  const showSpotDetail = useCallback((spot: any) => {
    // 지도 중심 이동만 처리
    if (!mapInstance) return;

    const moveLatLng = new window.kakao.maps.LatLng(spot.lat, spot.lng);
    const currentLevel = mapInstance.getLevel();
    const targetLevel = 3;

    if (currentLevel > 5) {
      mapInstance.setLevel(targetLevel);
      setTimeout(() => {
        mapInstance.panTo(moveLatLng);
      }, 200);
    } else {
      mapInstance.panTo(moveLatLng);
      setTimeout(() => {
        if (mapInstance.getLevel() !== targetLevel) {
          mapInstance.setLevel(targetLevel);
        }
      }, 300);
    }

    // 외부 콜백 호출 (PlaceDetailPanel 표시용)
    callbacks.onSpotClick?.(spot);
  }, [mapInstance, callbacks]);

  return {
    showSpotDetail
  };
};
