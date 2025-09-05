import { configureStore } from '@reduxjs/toolkit';
import placesSlice from './slices/placesSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    places: placesSlice,
    ui: uiSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
