import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { makeStore } from '../../../app/appStore';
import { GameEventCue } from '../../../domain/types/game.enums';
import { setSoundCue, setSoundEnabled } from '../uiSlice';
import { useGameSounds } from './useGameSounds';

/**
 * The sound is chosen in the thunk and played here, so what this covers is the
 * playing: once per cue, twice for the same cue twice, and never when muted.
 */
const renderWithStore = (store: ReturnType<typeof makeStore>) =>
  renderHook(() => useGameSounds(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

let play: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useGameSounds', () => {
  it('plays nothing until something happens', () => {
    renderWithStore(makeStore());

    expect(play).not.toHaveBeenCalled();
  });

  it('plays the cue the thunk chose', () => {
    const store = makeStore();
    renderWithStore(store);

    act(() => {
      store.dispatch(setSoundCue({ id: 'event-1', cue: GameEventCue.Bought }));
    });

    expect(play).toHaveBeenCalledOnce();
  });

  /**
   * Keyed on the event's id rather than the cue's value: paying rent twice in a
   * row is two sounds, and keying on the value alone would swallow the second.
   */
  it('plays the same cue twice when it happens twice', () => {
    const store = makeStore();
    renderWithStore(store);

    act(() => {
      store.dispatch(setSoundCue({ id: 'event-1', cue: GameEventCue.Rent }));
    });
    act(() => {
      store.dispatch(setSoundCue({ id: 'event-2', cue: GameEventCue.Rent }));
    });

    expect(play).toHaveBeenCalledTimes(2);
  });

  // Cleared after playing, so a re-render for any other reason cannot replay it.
  it('does not replay on a re-render', () => {
    const store = makeStore();
    const { rerender } = renderWithStore(store);

    act(() => {
      store.dispatch(setSoundCue({ id: 'event-1', cue: GameEventCue.Credit }));
    });
    rerender();
    rerender();

    expect(play).toHaveBeenCalledOnce();
  });

  it('plays nothing at all when muted', () => {
    const store = makeStore();
    renderWithStore(store);

    act(() => {
      store.dispatch(setSoundEnabled(false));
    });
    act(() => {
      store.dispatch(setSoundCue({ id: 'event-1', cue: GameEventCue.Won }));
    });

    expect(play).not.toHaveBeenCalled();
  });

  /**
   * Nothing may be left queued while muted, or it would fire the moment sound
   * came back on - a sound for something that happened minutes ago.
   */
  it('does not save up a cue to play when sound returns', () => {
    const store = makeStore();
    renderWithStore(store);

    act(() => {
      store.dispatch(setSoundEnabled(false));
    });
    act(() => {
      store.dispatch(setSoundCue({ id: 'event-1', cue: GameEventCue.Won }));
    });
    act(() => {
      store.dispatch(setSoundEnabled(true));
    });

    expect(play).not.toHaveBeenCalled();
    expect(store.getState().ui.soundCue).toBeNull();
  });

  it('says nothing for the cue that has no sound', () => {
    const store = makeStore();
    renderWithStore(store);

    act(() => {
      store.dispatch(setSoundCue({ id: 'event-1', cue: GameEventCue.None }));
    });

    expect(play).not.toHaveBeenCalled();
  });
});
