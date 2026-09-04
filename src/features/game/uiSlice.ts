import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MAX_VISIBLE_TOASTS } from './game.constants';
import type { Toast } from '../../components/game/overlays/overlays.interfaces';
import type { KeyedBidInput } from './auctionBid.interfaces';
import type { PendingFeedback, PendingSoundCue } from './feedback.interfaces';
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
  /** Ephemeral action feedback, on screen now. Never persisted. */
  toasts: Toast[];
  /**
   * What the last command had to say, still waiting on the board to catch up.
   *
   * A command resolves the whole turn at once, so its toasts and its sound used
   * to be on screen while the token was still three spaces away - the outcome
   * announced before the move that caused it. They wait here instead, and
   * `useFeedbackGate` releases them once every token has arrived.
   */
  pendingFeedback: PendingFeedback;
  /**
   * The cue to sound, and an id so the same cue twice in a row sounds twice.
   * Null once nothing is pending.
   */
  soundCue: PendingSoundCue | null;
  /** Whether sound plays at all. Remembered across games, not per save. */
  soundEnabled: boolean;
}

const noFeedback = (): PendingFeedback => ({ toasts: [], cue: null });

export const uiInitialState: UiSliceState = {
  auctionBidInput: null,
  toasts: [],
  pendingFeedback: noFeedback(),
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
        // Nothing queued should sound after the switch goes off - including a
        // cue still waiting on a walk, which would otherwise fire on arrival.
        state.soundCue = null;
        state.pendingFeedback.cue = null;
      }
    },
    /**
     * Holds what a command had to say until the board has caught up with it.
     *
     * Toasts append: a property command taken while another token is still
     * walking must not push the walker's own feedback out of the queue.
     *
     * The cue has one slot and the newest wins - a sound is for the thing you
     * just did, and there is only one channel to play it on. Within a single
     * command the pick is already made by priority in `cueForEvents`, so this is
     * only ever the rarer case of two commands landing before either is shown.
     */
    queueFeedback(state, action: PayloadAction<PendingFeedback>) {
      state.pendingFeedback.toasts.push(...action.payload.toasts);
      if (action.payload.cue) {
        state.pendingFeedback.cue = action.payload.cue;
      }
    },
    /** Puts the queue on screen. Called once every token has arrived. */
    releaseFeedback(state) {
      // Newest last, capped: a single command can append several events, and an
      // unbounded stack would cover the board.
      const merged = [...state.toasts, ...state.pendingFeedback.toasts];
      state.toasts = merged.slice(-MAX_VISIBLE_TOASTS);
      if (state.pendingFeedback.cue) {
        state.soundCue = state.pendingFeedback.cue;
      }
      state.pendingFeedback = noFeedback();
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
      state.pendingFeedback = noFeedback();
    },
  },
});

export const uiReducer = slice.reducer;
export const {
  setAuctionBidInput,
  setSoundCue,
  setSoundEnabled,
  queueFeedback,
  releaseFeedback,
  dismissToast,
  clearToasts,
} = slice.actions;
