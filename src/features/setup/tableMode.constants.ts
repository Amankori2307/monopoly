import { TableMode } from '../../domain/types/game.enums';

/**
 * A word for every table mode.
 *
 * An exhaustive `Record`, the same tactic as `SOUND_FOR_CUE` and
 * `AUDIENCE_FOR_DECISION`: a new mode is a type error here rather than a blank
 * badge on the home screen.
 */
export const TABLE_MODE_LABEL: Record<TableMode, string> = {
  [TableMode.HotSeat]: 'Local',
  [TableMode.Online]: 'Online',
};
