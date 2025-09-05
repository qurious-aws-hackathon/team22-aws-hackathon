import React from 'react';
import { Card, CardContent, Typography, Box, Chip, IconButton } from '@mui/material';
import { LocationOn, VolumeDown, People } from '@mui/icons-material';
import { Place } from '../../store/slices/placesSlice';

interface PlaceCardProps {
  place: Place;
  onClick?: () => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, onClick }) => {
  const getScoreColor = (score: number) => {
    if (score <= 3) return 'success';
    if (score <= 6) return 'warning';
    return 'error';
  };

  const getScoreText = (score: number, type: 'noise' | 'crowd') => {
    if (type === 'noise') {
      if (score <= 3) return '조용함';
      if (score <= 6) return '보통';
      return '시끄러움';
    } else {
      if (score <= 3) return '한적함';
      if (score <= 6) return '보통';
      return '혼잡함';
    }
  };

  return (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { elevation: 4 } : {},
        transition: 'all 0.2s ease-in-out'
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {place.name}
          </Typography>
          <Chip 
            label={place.category}
            size="small"
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
          <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
          <Typography variant="body2">
            {place.address}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            icon={<VolumeDown />}
            label={`${getScoreText(place.noiseScore, 'noise')} ${place.noiseScore}/10`}
            color={getScoreColor(place.noiseScore)}
            size="small"
          />
          <Chip
            icon={<People />}
            label={`${getScoreText(place.crowdScore, 'crowd')} ${place.crowdScore}/10`}
            color={getScoreColor(place.crowdScore)}
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            종합 점수
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                color: getScoreColor(place.totalScore) === 'success' ? 'success.main' : 
                       getScoreColor(place.totalScore) === 'warning' ? 'warning.main' : 'error.main'
              }}
            >
              {place.totalScore}/10
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PlaceCard;
