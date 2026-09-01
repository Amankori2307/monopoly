import { describe, expect, it } from 'vitest';
import type { Toast } from '../../components/game/overlays/overlays.interfaces';
import { MAX_VISIBLE_TOASTS } from './game.constants';
import {
  clearToasts,
  dismissToast,
  pushToasts,
  setAuctionBidInput,
  uiReducer,
} from './uiSlice';

/**
 * Ephemeral UI state: the auction bid input and the toast stack. Never
 * persisted, so a reload is expected to start clean.
 */

const toast = (id: string): Toast => ({ id, message: `event ${id}`, tone: 'neutral' });

const initial = () => uiReducer(undefined, { type: '@@init' });

describe('the auction bid input', () => {
  it('starts at the opening price', () => {
    expect(initial().auctionBidInput).toBe(10);
  });

  it('takes whatever the panel puts in it', () => {
    const state = uiReducer(initial(), setAuctionBidInput(250));

    expect(state.auctionBidInput).toBe(250);
  });

  // The engine is what rejects a bid below the minimum; the input must not
  // second-guess it, or the panel and the rules would disagree.
  it('does not police the amount', () => {
    expect(uiReducer(initial(), setAuctionBidInput(0)).auctionBidInput).toBe(0);
    expect(uiReducer(initial(), setAuctionBidInput(-5)).auctionBidInput).toBe(-5);
  });
});

describe('the toast stack', () => {
  it('starts empty', () => {
    expect(initial().toasts).toEqual([]);
  });

  it('appends newest last, so a burst reads in order', () => {
    const state = uiReducer(initial(), pushToasts([toast('a'), toast('b')]));

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('keeps earlier toasts when more arrive', () => {
    let state = uiReducer(initial(), pushToasts([toast('a')]));
    state = uiReducer(state, pushToasts([toast('b')]));

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  // One command can append several events, and an unbounded stack would cover
  // the board - which is the bug the cap exists for.
  it('caps the stack, dropping the oldest', () => {
    const many = Array.from({ length: MAX_VISIBLE_TOASTS + 2 }, (_, index) =>
      toast(String(index))
    );

    const state = uiReducer(initial(), pushToasts(many));

    expect(state.toasts).toHaveLength(MAX_VISIBLE_TOASTS);
    // The newest survive: the last three of five.
    expect(state.toasts.map((entry) => entry.id)).toEqual(['2', '3', '4']);
  });

  it('caps across separate pushes too', () => {
    let state = initial();
    for (let index = 0; index < MAX_VISIBLE_TOASTS + 2; index += 1) {
      state = uiReducer(state, pushToasts([toast(String(index))]));
    }

    expect(state.toasts).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(state.toasts[state.toasts.length - 1].id).toBe(String(MAX_VISIBLE_TOASTS + 1));
  });

  it('pushing nothing changes nothing', () => {
    const state = uiReducer(
      uiReducer(initial(), pushToasts([toast('a')])),
      pushToasts([])
    );

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a']);
  });

  it('dismisses one by id and leaves the rest', () => {
    const state = uiReducer(
      uiReducer(initial(), pushToasts([toast('a'), toast('b')])),
      dismissToast('a')
    );

    expect(state.toasts.map((entry) => entry.id)).toEqual(['b']);
  });

  it('ignores a dismissal for a toast that has already gone', () => {
    const state = uiReducer(
      uiReducer(initial(), pushToasts([toast('a')])),
      dismissToast('gone')
    );

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a']);
  });

  it('clears the whole stack', () => {
    const state = uiReducer(
      uiReducer(initial(), pushToasts([toast('a'), toast('b')])),
      clearToasts()
    );

    expect(state.toasts).toEqual([]);
  });

  it('leaves the bid input alone while toasts come and go', () => {
    let state = uiReducer(initial(), setAuctionBidInput(120));
    state = uiReducer(state, pushToasts([toast('a')]));
    state = uiReducer(state, clearToasts());

    expect(state.auctionBidInput).toBe(120);
  });
});
