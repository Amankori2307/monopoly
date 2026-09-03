import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MAX_VISIBLE_TOASTS } from './game.constants';
import type { Toast } from '../../components/game/overlays/overlays.interfaces';
import type { KeyedBidInput, PendingSoundCue } from './auctionBid.interfaces';
import { writeSoundPreference } from './soundPreference.utils';

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
  /**
   * The cue to sound, and an id so the same cue twice in a row sounds twice.
   * Null once nothing is pending.
   */
  soundCue: PendingSoundCue | null;
  /** Whether sound plays at all. Remembered across games, not per save. */
  soundEnabled: boolean;
}

export const uiInitialState: UiSliceState = {
  auctionBidInput: null,
  toasts: [],
  soundCue: null,
  // A pure default. The saved preference is read in makeStore, because a
  // module-level read happens once - so a store built later never saw a change,
  // which is exactly what the integration test caught.
  soundEnabled: true,
};

const slice = createSlice({
  name: 'ui',
  initialState: uiInitialState,
  reducers: {
    setAuctionBidInput(state, action: PayloadAction<KeyedBidInput>) {
      state.auctionBidInput = action.payload;
    },
    setSoundCue(state, action: PayloadAction<PendingSoundCue | null>) {
      state.soundCue = action.payload;
    },
    setSoundEnabled(state, action: PayloadAction<boolean>) {
      state.soundEnabled = action.payload;
      // Written here rather than in a thunk: it is one value with no ordering
      // to get wrong, and every caller would otherwise have to remember.
      writeSoundPreference(action.payload);
      if (!action.payload) {
        // Nothing queued should sound after the switch goes off.
        state.soundCue = null;
      }
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
export const {
  setAuctionBidInput,
  setSoundCue,
  setSoundEnabled,
  pushToasts,
  dismissToast,
  clearToasts,
} = slice.actions;
