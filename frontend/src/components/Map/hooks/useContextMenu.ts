import { useState, useCallback, useEffect } from 'react';

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  lat: number;
  lng: number;
}

interface ContextMenuActions {
  onRegisterPin: (lat: number, lng: number) => void;
  onSetStartPoint: (lat: number, lng: number) => void;
  onSetEndPoint: (lat: number, lng: number) => void;
  onAddWaypoint: (lat: number, lng: number) => void;
  onClearRoute: () => void;
}

export const useContextMenu = (mapRef: React.RefObject<HTMLDivElement>, mapInstance: any, actions: ContextMenuActions) => {
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    lat: 0,
    lng: 0
  });

  const calculateScreenCoordinates = useCallback((latlng: any, mapRect: DOMRect) => {
    try {
      const projection = mapInstance.getProjection();
      const mapCenter = mapInstance.getCenter();
      const mapCenterPixel = projection.pointFromCoords(mapCenter);
      const clickPixel = projection.pointFromCoords(latlng);

      const offsetX = clickPixel.x - mapCenterPixel.x;
      const offsetY = clickPixel.y - mapCenterPixel.y;

      return {
        x: mapRect.left + mapRect.width / 2 + offsetX,
        y: mapRect.top + mapRect.height / 2 + offsetY
      };
    } catch (error) {
      console.error('화면 좌표 계산 실패:', error);
      return {
        x: mapRect.left + mapRect.width / 2,
        y: mapRect.top + mapRect.height / 2
      };
    }
  }, [mapInstance]);

  const showContextMenu = useCallback((mouseEvent: any) => {
    if (!mapRef.current) return;

    const latlng = mouseEvent.latLng;
    const lat = latlng.getLat();
    const lng = latlng.getLng();
    const rect = mapRef.current.getBoundingClientRect();
    
    const screenCoords = calculateScreenCoordinates(latlng, rect);

    setContextMenu({
      visible: true,
      x: screenCoords.x,
      y: screenCoords.y,
      lat,
      lng
    });
  }, [mapRef, calculateScreenCoordinates]);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleContextMenuAction = useCallback((action: string) => {
    const { lat, lng } = contextMenu;

    switch (action) {
      case 'register':
        actions.onRegisterPin(lat, lng);
        break;
      case 'start':
        actions.onSetStartPoint(lat, lng);
        break;
      case 'end':
        actions.onSetEndPoint(lat, lng);
        break;
      case 'waypoint':
        actions.onAddWaypoint(lat, lng);
        break;
      case 'clear-route':
        actions.onClearRoute();
        break;
    }

    hideContextMenu();
  }, [contextMenu, actions, hideContextMenu]);

  // Setup map event listeners
  useEffect(() => {
    if (!mapInstance || !mapRef.current) return;

    // Right-click event
    const rightClickListener = window.kakao.maps.event.addListener(
      mapInstance, 
      'rightclick', 
      showContextMenu
    );

    // Prevent browser context menu
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    mapRef.current.addEventListener('contextmenu', preventContextMenu);

    // Click outside to close
    const handleDocumentClick = () => hideContextMenu();
    document.addEventListener('click', handleDocumentClick);

    return () => {
      window.kakao.maps.event.removeListener(rightClickListener);
      mapRef.current?.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [mapInstance, mapRef, showContextMenu, hideContextMenu]);

  return {
    contextMenu,
    handleContextMenuAction,
    hideContextMenu
  };
};
