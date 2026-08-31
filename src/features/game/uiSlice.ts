import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MAX_VISIBLE_TOASTS } from './game.constants';
import type { Toast } from '../../components/game/overlays/overlays.interfaces';

interface UiSliceState {
  auctionBidInput: number;
  /** Ephemeral action feedback. Never persisted - a reload starts clean. */
  toasts: Toast[];
}

const initialState: UiSliceState = {
  auctionBidInput: 10,
  toasts: [],
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAuctionBidInput(state, action: PayloadAction<number>) {
      state.auctionBidInput = action.payload;
    },
    pushToasts(state, action: PayloadAction<Toast[]>) {
      // Newest last, capped: a single command can append several events, and an
      // unbounded stack would cover the board.
      const merged = [...state.toasts, ...action.payload];
      state.toasts = merged.slice(-MAX_VISIBLE_TOASTS);
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const uiReducer = slice.reducer;
export const { setAuctionBidInput, pushToasts, dismissToast, clearToasts } =
  slice.actions;
