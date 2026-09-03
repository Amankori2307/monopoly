import { describe, expect, it } from 'vitest';
import { GameEventCue } from '../../domain/types/game.enums';
import type { GameEvent } from '../../domain/types/game.interfaces';
import { cueForEvents } from './soundCue.utils';
import { CUE_PRIORITY, SOUND_FOR_CUE } from './soundCues.constants';

const event = (cue: GameEventCue): GameEvent => ({
  id: `event-${cue}`,
  turnNumber: 1,
  createdAt: '2026-09-03T00:00:00.000Z',
  message: cue,
  cue,
});

describe('cueForEvents', () => {
  it('sounds nothing for a turn where nothing happened', () => {
    expect(cueForEvents([])).toBeNull();
    expect(cueForEvents([event(GameEventCue.None)])).toBeNull();
  });

  it('sounds the one thing that happened', () => {
    expect(cueForEvents([event(GameEventCue.Credit)])).toBe(GameEventCue.Credit);
  });

  /**
   * One command can append several events - a card that leaves three debts, or a
   * bankruptcy that settles a debt and ends the game in the same breath. All of
   * them sounding at once is noise, so the most significant one wins and the
   * toasts carry the rest.
   */
  it('picks the most significant of a batch', () => {
    expect(
      cueForEvents([
        event(GameEventCue.Debit),
        event(GameEventCue.Credit),
        event(GameEventCue.Jailed),
      ])
    ).toBe(GameEventCue.Jailed);
  });

  it('lets winning the game beat everything', () => {
    const everything = CUE_PRIORITY.map(event);

    expect(cueForEvents(everything)).toBe(GameEventCue.Won);
  });

  it('ignores the events with nothing to sound', () => {
    expect(cueForEvents([event(GameEventCue.None), event(GameEventCue.Built)])).toBe(
      GameEventCue.Built
    );
  });

  it('does not care what order the batch arrives in', () => {
    const forwards = [event(GameEventCue.Rent), event(GameEventCue.Bought)];

    expect(cueForEvents(forwards)).toBe(cueForEvents([...forwards].reverse()));
    expect(cueForEvents(forwards)).toBe(GameEventCue.Bought);
  });

  // A cue with no clip behind it is the same as no cue: the priority list must
  // not be able to select silence over something audible.
  it('never picks a cue with no sound', () => {
    CUE_PRIORITY.forEach((cue) => {
      expect(
        SOUND_FOR_CUE[cue],
        `${cue} is in the priority list with no clip`
      ).toBeTruthy();
    });
  });
});
