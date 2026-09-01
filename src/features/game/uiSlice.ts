import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MAX_VISIBLE_TOASTS } from './game.constants';
import type { Toast } from '../../components/game/overlays/overlays.interfaces';
import type { KeyedBidInput } from './auctionBid.interfaces';

interface UiSliceState {
  /**
   * What the bidder has typed, and which moment of which auction they typed it
   * at. Null until they touch the field.
   *
   * Keyed, not a bare number: the field has to arrive holding the minimum legal
   * bid, and that minimum changes every time a bid lands or the turn passes to
   * the next bidder. Keeping the moment alongside the amount makes the prefill a
   * pure derivation - a stored amount whose key no longer matches is simply
   * stale, and the minimum is used instead. No effect to fire, nothing to reset
   * between the queued auctions of a bankruptcy.
   */
  auctionBidInput: KeyedBidInput | null;
  /** Ephemeral action feedback. Never persisted - a reload starts clean. */
  toasts: Toast[];
}

const initialState: UiSliceState = {
  auctionBidInput: null,
  toasts: [],
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAuctionBidInput(state, action: PayloadAction<KeyedBidInput>) {
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
