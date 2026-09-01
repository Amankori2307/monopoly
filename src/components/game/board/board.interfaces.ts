import type { PlayerId } from '../../../domain/types/game.interfaces';

/**
 * Shared shapes for the board. These live in the component layer because
 * presentational components may not import from features - the feature layer
 * builds them and passes them down. See docs/conventions.md section 5.
 */

/** What a board cell needs in order to show who owns it. */
export interface SpaceOwnerMark {
  /** The owner's token colour. Token colours are data, not CSS tokens. */
  color: string;
  mortgaged: boolean;
  ownerName: string;
  /** 0-4 houses, or HOTEL_BUILD_LEVEL for a hotel. Drawn on the colour ribbon. */
  buildLevel: number;
}

/** Where each token is drawn, by player. Lags the engine while a token walks. */
export type TokenPositions = Record<PlayerId, number>;
