import type { ColorGroup } from '../types/game.enums';
import type { OwnableSpace } from '../types/game.interfaces';

/** Shapes returned by holdings.utils.ts. */

/** Progress towards owning a whole colour set - the key strategic signal. */
export interface ColorGroupProgress {
  group: ColorGroup;
  owned: number;
  total: number;
  isComplete: boolean;
}

/** One group of a player's holdings, as shown in the holdings drawer. */
export interface HoldingsSection {
  id: string;
  label: string;
  /** Set only for street groups, so the UI can show a colour swatch. */
  colorGroup?: ColorGroup;
  spaces: OwnableSpace[];
  owned: number;
  total: number;
  isComplete: boolean;
}
