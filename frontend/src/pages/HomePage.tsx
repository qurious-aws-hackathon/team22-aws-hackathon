import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Grid } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setCurrentLocation, setPlaces } from '../store/slices/placesSlice';
import MapComponent from '../components/Map/MapComponent';
import PlaceCard from '../components/UI/PlaceCard';

// 임시 데이터
const mockPlaces = [
  {
    id: '1',
    name: '한강공원 여의도',
    latitude: 37.5285,
    longitude: 126.9342,
    noiseScore: 3,
    crowdScore: 2,
    totalScore: 2.5,
    category: '공원',
    address: '서울 영등포구 여의도동',
  },
  {
    id: '2',
    name: '국립중앙도서관',
    latitude: 37.5058,
    longitude: 127.0369,
    noiseScore: 1,
    crowdScore: 3,
    totalScore: 2.0,
    category: '도서관',
    address: '서울 서초구 반포대로 201',
  },
  {
    id: '3',
    name: '남산공원',
    latitude: 37.5512,
    longitude: 126.9882,
    noiseScore: 4,
    crowdScore: 5,
    totalScore: 4.5,
    category: '공원',
    address: '서울 중구 남산공원길',
  },
];

const HomePage: React.FC = () => {
  const dispatch = useDispatch();
  const { places, currentLocation } = useSelector((state: RootState) => state.places);
  const { mapCenter } = useSelector((state: RootState) => state.ui);

  useEffect(() => {
    // 현재 위치 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          dispatch(setCurrentLocation({ lat: latitude, lng: longitude }));
        },
        (error) => {
          console.error('위치 정보를 가져올 수 없습니다:', error);
        }
      );
    }

    // 임시 데이터 설정
    dispatch(setPlaces(mockPlaces));
  }, [dispatch]);

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* 지도 영역 */}
      <Box sx={{ flex: 1 }}>
        <MapComponent
          places={places}
          center={currentLocation || mapCenter}
        />
      </Box>

      {/* 사이드바 */}
      <Box sx={{ width: 400, p: 2, overflow: 'auto', borderLeft: 1, borderColor: 'divider' }}>
        <Typography variant="h5" gutterBottom>
          조용한 장소 추천
        </Typography>
        
        <Card sx={{ mb: 2, bgcolor: 'primary.light', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🤫 지금 가장 조용한 곳
            </Typography>
            <Typography variant="body2">
              현재 위치 기준으로 가장 조용하고 한적한 장소를 추천해드립니다.
            </Typography>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          {places.map((place) => (
            <Grid item xs={12} key={place.id}>
              <PlaceCard place={place} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default HomePage;
