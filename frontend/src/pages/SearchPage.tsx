import React from 'react';
import { Box, Typography } from '@mui/material';

const SearchPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔍 검색 페이지
      </Typography>
      <Typography variant="body1" color="text.secondary">
        검색 기능이 구현될 예정입니다.
      </Typography>
    </Box>
  );
};

export default SearchPage;
