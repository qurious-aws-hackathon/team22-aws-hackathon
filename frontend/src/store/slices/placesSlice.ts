import { createSlice } from '@reduxjs/toolkit';

export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  noiseScore: number;
  crowdScore: number;
  totalScore: number;
  category: string;
  address: string;
}

interface PlacesState {
  currentLocation: { lat: number; lng: number } | null;
  selectedPlace: Place | null;
  places: Place[];
  loading: boolean;
  error: string | null;
}

const initialState: PlacesState = {
  currentLocation: null,
  selectedPlace: null,
  places: [],
  loading: false,
  error: null,
};

const placesSlice = createSlice({
  name: 'places',
  initialState,
  reducers: {
    setCurrentLocation: (state, action: { payload: { lat: number; lng: number } }) => {
      state.currentLocation = action.payload;
    },
    setSelectedPlace: (state, action: { payload: Place | null }) => {
      state.selectedPlace = action.payload;
    },
    setPlaces: (state, action: { payload: Place[] }) => {
      state.places = action.payload;
    },
    setLoading: (state, action: { payload: boolean }) => {
      state.loading = action.payload;
    },
    setError: (state, action: { payload: string | null }) => {
      state.error = action.payload;
    },
  },
});

export const { setCurrentLocation, setSelectedPlace, setPlaces, setLoading, setError } = placesSlice.actions;
export default placesSlice.reducer;
