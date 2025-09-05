import React from 'react';
import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

const PlaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📍 장소 상세 정보
      </Typography>
      <Typography variant="body1" color="text.secondary">
        장소 ID: {id}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        상세 정보가 구현될 예정입니다.
      </Typography>
    </Box>
  );
};

export default PlaceDetailPage;
