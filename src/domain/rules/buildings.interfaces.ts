import type { ColorGroup } from '../types/game.enums';
import type { SpaceId } from '../types/game.interfaces';

/** One street a player could sell a building from, and what it would pay. */
export interface SellableBuilding {
  spaceId: SpaceId;
  name: string;
  colorGroup: ColorGroup;
  /** 1-4 houses, or HOTEL_BUILD_LEVEL for a hotel. */
  buildLevel: number;
  /** Half what the building cost, rounded down - what the bank pays back. */
  refund: number;
  /** True when the sale is a hotel reverting to four houses. */
  isHotel: boolean;
}
