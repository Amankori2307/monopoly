import type { TokenId } from '../../domain/types/game.interfaces';

/** One seat at a table that has not started yet. */
export interface LobbySeat {
  /** Becomes the player's id when the game is created. */
  seatId: string;
  name: string;
  tokenId: TokenId;
  /** Which device holds it. A reconnect from a new device changes this. */
  deviceId: string;
  claimedAt: string;
}

/**
 * The table's own options, carried in the lobby URL beside the code.
 *
 * Not in Redux: the lobby is where the game is started, not where it is
 * configured, and a host reloading their own lobby is routine - Redux would
 * lose the edition and hand everybody the first one instead. Not in the row's
 * `state` jsonb either, which would be more robust but means new reads and
 * writes on the one code path that cannot be tested locally.
 *
 * The edition matters to a guest, not just to the host: seat tokens come from
 * `theme.tokenCatalog`, so a guest picking a token from the wrong edition sends
 * an id the host's board has no piece for.
 */
export interface TableOptions {
  themeId: string;
  useSpeedDie: boolean;
}
