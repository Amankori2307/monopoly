import { describe, expect, it } from 'vitest';
import { TableMode } from '../../domain/types/game.enums';
import { TABLE_MESSAGES } from '../multiplayer/multiplayer.constants';
import { resumeBlockedReason } from './resume.utils';

describe('resumeBlockedReason', () => {
  it('never blocks a local game', () => {
    expect(resumeBlockedReason(TableMode.HotSeat, false)).toBeNull();
  });

  it('lets an online game through when this device holds the code', () => {
    expect(resumeBlockedReason(TableMode.Online, true)).toBeNull();
  });

  /**
   * The state is on disk and completely unplayable: reading or writing the
   * table needs the code, so the button has to say so rather than opening a
   * game with every control dead.
   */
  it('blocks an online game whose code this device does not have', () => {
    expect(resumeBlockedReason(TableMode.Online, false)).toBe(TABLE_MESSAGES.codeLost);
  });
});
