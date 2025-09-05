import { createSlice } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  searchQuery: string;
}

const initialState: UiState = {
  sidebarOpen: false,
  mapCenter: { lat: 37.5665, lng: 126.9780 }, // 서울 시청
  mapZoom: 13,
  searchQuery: '',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen: (state, action: { payload: boolean }) => {
      state.sidebarOpen = action.payload;
    },
    setMapCenter: (state, action: { payload: { lat: number; lng: number } }) => {
      state.mapCenter = action.payload;
    },
    setMapZoom: (state, action: { payload: number }) => {
      state.mapZoom = action.payload;
    },
    setSearchQuery: (state, action: { payload: string }) => {
      state.searchQuery = action.payload;
    },
  },
});

export const { setSidebarOpen, setMapCenter, setMapZoom, setSearchQuery } = uiSlice.actions;
export default uiSlice.reducer;
