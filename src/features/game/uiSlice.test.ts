import { describe, expect, it } from 'vitest';
import type { Toast } from '../../components/game/overlays/overlays.interfaces';
import { GameEventCue } from '../../domain/types/game.enums';
import { MAX_VISIBLE_TOASTS } from './game.constants';
import {
  clearToasts,
  dismissToast,
  queueFeedback,
  releaseFeedback,
  setAuctionBidInput,
  setSoundEnabled,
  uiReducer,
} from './uiSlice';

/**
 * Ephemeral UI state: the auction bid input, the pending feedback queue, and
 * the toast stack. Never persisted, so a reload is expected to start clean.
 */

const toast = (id: string): Toast => ({ id, message: `event ${id}`, tone: 'neutral' });

const initial = () => uiReducer(undefined, { type: '@@init' });

/**
 * Nothing reaches the stack except through the queue, because that is the only
 * path the game has: the thunk queues and `useFeedbackGate` releases once the
 * token has arrived. The tests take the same route rather than a shortcut.
 */
const pushToasts = (toasts: Toast[]) => queueFeedback({ toasts, cue: null });

const shown = (state: ReturnType<typeof initial>, toasts: Toast[]) =>
  uiReducer(uiReducer(state, pushToasts(toasts)), releaseFeedback());

describe('the auction bid input', () => {
  const typed = (key: string, amount: number) => ({ key, amount });

  // Nothing typed yet. The field shows the minimum legal bid instead, which
  // selectBidField derives - the slice holds only what a player actually typed.
  it('starts holding nothing', () => {
    expect(initial().auctionBidInput).toBeNull();
  });

  it('takes whatever the panel puts in it, and the moment it belongs to', () => {
    const state = uiReducer(initial(), setAuctionBidInput(typed('a:p1:0', 250)));

    expect(state.auctionBidInput).toEqual({ key: 'a:p1:0', amount: 250 });
  });

  // The engine is what rejects a bid below the minimum; the input must not
  // second-guess it, or the panel and the rules would disagree.
  it('does not police the amount', () => {
    expect(
      uiReducer(initial(), setAuctionBidInput(typed('k', 0))).auctionBidInput
    ).toEqual(typed('k', 0));
    expect(
      uiReducer(initial(), setAuctionBidInput(typed('k', -5))).auctionBidInput
    ).toEqual(typed('k', -5));
  });

  // Each entry replaces the last: a bidder retyping is still one bid.
  it('keeps only the latest entry', () => {
    let state = uiReducer(initial(), setAuctionBidInput(typed('a:p1:0', 20)));
    state = uiReducer(state, setAuctionBidInput(typed('a:p1:0', 60)));

    expect(state.auctionBidInput).toEqual(typed('a:p1:0', 60));
  });
});

/**
 * The queue is what keeps a toast from beating the token to the space it is
 * about. The thunk fills it; the screen empties it once every walk has settled.
 */
describe('the pending feedback queue', () => {
  const cue = (id: string) => ({ id, cue: GameEventCue.Rent });

  it('starts empty', () => {
    expect(initial().pendingFeedback).toEqual({ toasts: [], cue: null });
  });

  // The whole point: queued is not shown.
  it('holds a queued toast back from the stack', () => {
    const state = uiReducer(initial(), pushToasts([toast('a')]));

    expect(state.toasts).toEqual([]);
    expect(state.pendingFeedback.toasts.map((entry) => entry.id)).toEqual(['a']);
  });

  it('holds a queued cue back from the sound slot', () => {
    const state = uiReducer(
      initial(),
      queueFeedback({ toasts: [], cue: cue('event-1') })
    );

    expect(state.soundCue).toBeNull();
    expect(state.pendingFeedback.cue).toEqual(cue('event-1'));
  });

  it('releases both at once, so a sound and its toast stay together', () => {
    const state = uiReducer(
      uiReducer(initial(), queueFeedback({ toasts: [toast('a')], cue: cue('a') })),
      releaseFeedback()
    );

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a']);
    expect(state.soundCue).toEqual(cue('a'));
    expect(state.pendingFeedback).toEqual({ toasts: [], cue: null });
  });

  // A property command taken while another token is still walking must not
  // push the walker's own feedback out of the queue.
  it('appends a second command rather than replacing the first', () => {
    let state = uiReducer(initial(), pushToasts([toast('a')]));
    state = uiReducer(state, pushToasts([toast('b')]));

    expect(state.pendingFeedback.toasts.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  // One channel, so the newest cue is the one that plays.
  it('keeps the newest cue when two are queued', () => {
    let state = uiReducer(initial(), queueFeedback({ toasts: [], cue: cue('first') }));
    state = uiReducer(state, queueFeedback({ toasts: [], cue: cue('second') }));

    expect(state.pendingFeedback.cue).toEqual(cue('second'));
  });

  // A silent command must not wipe the cue a moving one is still waiting on.
  it('keeps a queued cue when a later command has none', () => {
    let state = uiReducer(initial(), queueFeedback({ toasts: [], cue: cue('first') }));
    state = uiReducer(state, pushToasts([toast('b')]));

    expect(state.pendingFeedback.cue).toEqual(cue('first'));
  });

  it('releasing an empty queue leaves the stack alone', () => {
    const state = uiReducer(shown(initial(), [toast('a')]), releaseFeedback());

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a']);
    expect(state.soundCue).toBeNull();
  });

  // Muting reaches the queue too, or a cue waiting on a walk fires on arrival
  // after the player has already switched the sound off.
  it('drops a queued cue when sound is switched off', () => {
    const state = uiReducer(
      uiReducer(initial(), queueFeedback({ toasts: [], cue: cue('a') })),
      setSoundEnabled(false)
    );

    expect(state.pendingFeedback.cue).toBeNull();
    expect(uiReducer(state, releaseFeedback()).soundCue).toBeNull();
  });

  it('keeps the toasts of a command whose cue the mute dropped', () => {
    let state = uiReducer(
      initial(),
      queueFeedback({ toasts: [toast('a')], cue: cue('a') })
    );
    state = uiReducer(state, setSoundEnabled(false));

    expect(uiReducer(state, releaseFeedback()).toasts.map((entry) => entry.id)).toEqual([
      'a',
    ]);
  });
});

describe('the toast stack', () => {
  it('starts empty', () => {
    expect(initial().toasts).toEqual([]);
  });

  it('appends newest last, so a burst reads in order', () => {
    const state = shown(initial(), [toast('a'), toast('b')]);

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('keeps earlier toasts when more arrive', () => {
    const state = shown(shown(initial(), [toast('a')]), [toast('b')]);

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  // One command can append several events, and an unbounded stack would cover
  // the board - which is the bug the cap exists for.
  it('caps the stack, dropping the oldest', () => {
    const many = Array.from({ length: MAX_VISIBLE_TOASTS + 2 }, (_, index) =>
      toast(String(index))
    );

    const state = shown(initial(), many);

    expect(state.toasts).toHaveLength(MAX_VISIBLE_TOASTS);
    // The newest survive: the last three of five.
    expect(state.toasts.map((entry) => entry.id)).toEqual(['2', '3', '4']);
  });

  it('caps across separate releases too', () => {
    let state = initial();
    for (let index = 0; index < MAX_VISIBLE_TOASTS + 2; index += 1) {
      state = shown(state, [toast(String(index))]);
    }

    expect(state.toasts).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(state.toasts[state.toasts.length - 1].id).toBe(String(MAX_VISIBLE_TOASTS + 1));
  });

  it('releasing nothing changes nothing', () => {
    const state = shown(shown(initial(), [toast('a')]), []);

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a']);
  });

  it('dismisses one by id and leaves the rest', () => {
    const state = uiReducer(
      shown(initial(), [toast('a'), toast('b')]),
      dismissToast('a')
    );

    expect(state.toasts.map((entry) => entry.id)).toEqual(['b']);
  });

  it('ignores a dismissal for a toast that has already gone', () => {
    const state = uiReducer(shown(initial(), [toast('a')]), dismissToast('gone'));

    expect(state.toasts.map((entry) => entry.id)).toEqual(['a']);
  });

  it('clears the whole stack, queue included', () => {
    let state = shown(initial(), [toast('a'), toast('b')]);
    state = uiReducer(state, pushToasts([toast('c')]));
    state = uiReducer(state, clearToasts());

    expect(state.toasts).toEqual([]);
    expect(state.pendingFeedback).toEqual({ toasts: [], cue: null });
  });

  it('leaves the bid input alone while toasts come and go', () => {
    let state = uiReducer(initial(), setAuctionBidInput({ key: 'a:p1:0', amount: 120 }));
    state = shown(state, [toast('a')]);
    state = uiReducer(state, clearToasts());

    expect(state.auctionBidInput).toEqual({ key: 'a:p1:0', amount: 120 });
  });
});
