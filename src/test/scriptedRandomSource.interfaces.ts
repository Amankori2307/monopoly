import type { SpeedDieFace } from '../domain/types/game.enums';

/** One scripted roll: the two white dice, and the Speed Die face if in play. */
export interface ScriptedRoll {
  /** The two white dice, in order. */
  white: [number, number];
  /** The Speed Die face, when the game has one in play. */
  speedDie?: SpeedDieFace;
}
