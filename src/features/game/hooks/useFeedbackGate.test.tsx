import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeStore } from '../../../app/appStore';
import type { Toast } from '../../../components/game/overlays/overlays.interfaces';
import { GameEventCue } from '../../../domain/types/game.enums';
import { queueFeedback } from '../uiSlice';
import { useFeedbackGate } from './useFeedbackGate';

/**
 * The gate is the whole fix: a command resolves the turn in one step, and its
 * toasts must wait for the token to finish walking there.
 */

const toast = (id: string): Toast => ({ id, message: `event ${id}`, tone: 'neutral' });
const cue = { id: 'event-1', cue: GameEventCue.Rent };

let store: ReturnType<typeof makeStore>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

const renderGate = (isMoving: boolean) =>
  renderHook(({ moving }) => useFeedbackGate(moving), {
    initialProps: { moving: isMoving },
    wrapper,
  });

beforeEach(() => {
  store = makeStore();
});

describe('useFeedbackGate', () => {
  it('holds the queue while a token is walking', () => {
    store.dispatch(queueFeedback({ toasts: [toast('a')], cue }));

    renderGate(true);

    expect(store.getState().ui.toasts).toEqual([]);
    expect(store.getState().ui.soundCue).toBeNull();
  });

  it('releases the queue once every token has arrived', () => {
    store.dispatch(queueFeedback({ toasts: [toast('a')], cue }));

    const { rerender } = renderGate(true);
    rerender({ moving: false });

    expect(store.getState().ui.toasts.map((entry) => entry.id)).toEqual(['a']);
    expect(store.getState().ui.soundCue).toEqual(cue);
  });

  // A command that moves nobody - buying, mortgaging, building - has nothing to
  // wait for and must not be held up by the gate.
  it('releases immediately when nothing is moving', () => {
    renderGate(false);

    // Wrapped, because the release happens in an effect: the dispatch is the
    // command landing, and act() is React getting round to reacting to it.
    act(() => {
      store.dispatch(queueFeedback({ toasts: [toast('a')], cue: null }));
    });

    expect(store.getState().ui.toasts.map((entry) => entry.id)).toEqual(['a']);
  });

  // Everything the walk produced arrives together, in the order the engine
  // logged it - the roll, then what the space did about it.
  it('releases a whole turn in one go, oldest first', () => {
    store.dispatch(
      queueFeedback({ toasts: [toast('rolled'), toast('paid-rent')], cue: null })
    );

    const { rerender } = renderGate(true);
    rerender({ moving: false });

    expect(store.getState().ui.toasts.map((entry) => entry.id)).toEqual([
      'rolled',
      'paid-rent',
    ]);
  });

  it('does nothing at all when the queue is empty', () => {
    const { rerender } = renderGate(true);
    rerender({ moving: false });

    expect(store.getState().ui.toasts).toEqual([]);
    expect(store.getState().ui.soundCue).toBeNull();
  });

  // A second walk starting before the first has been shown: the queue is still
  // withheld, and nothing is lost when it finally drains.
  it('keeps holding when a new move starts before the queue drains', () => {
    store.dispatch(queueFeedback({ toasts: [toast('a')], cue: null }));

    const { rerender } = renderGate(true);
    act(() => {
      store.dispatch(queueFeedback({ toasts: [toast('b')], cue: null }));
    });
    rerender({ moving: true });

    expect(store.getState().ui.toasts).toEqual([]);

    rerender({ moving: false });

    expect(store.getState().ui.toasts.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});
