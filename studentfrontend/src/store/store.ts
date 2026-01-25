import { configureStore } from '@reduxjs/toolkit';
import courseSelectionReducer from './courseSelectionSlice';

export const store = configureStore({
  reducer: {
    courseSelection: courseSelectionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 