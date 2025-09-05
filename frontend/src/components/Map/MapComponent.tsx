import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Place } from '../../store/slices';

interface MapComponentProps {
  places: Place[];
  center: { lat: number; lng: number };
  zoom?: number;
}

const MapComponent: React.FC<MapComponentProps> = ({ places, center, zoom = 13 }) => {
  return (
    <Box sx={{ height: '100%', position: 'relative', bgcolor: '#e8f5e8' }}>
      {/* 임시 지도 영역 */}
      <Paper 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          bgcolor: '#f0f8f0'
        }}
      >
        <Typography variant="h4" color="primary" gutterBottom>
          🗺️ 지도 영역
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          카카오맵 API 연동 예정
        </Typography>
        <Typography variant="body2" color="text.secondary">
          중심점: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          표시할 장소: {places.length}개
        </Typography>
        
        {/* 임시 마커들 */}
        {places.map((place, index) => (
          <Box
            key={place.id}
            sx={{
              position: 'absolute',
              top: `${20 + index * 15}%`,
              left: `${30 + index * 20}%`,
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: place.totalScore <= 3 ? 'success.main' : 'warning.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              '&:hover': {
                transform: 'scale(1.1)',
              },
            }}
          >
            {place.totalScore}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default MapComponent;
