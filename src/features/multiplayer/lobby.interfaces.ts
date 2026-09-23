/** One seat at a table that has not started yet. */
export interface LobbySeat {
  /** Becomes the player's id when the game is created. */
  seatId: string;
  name: string;
  /**
   * Which device holds it. A reconnect from a new device changes this.
   *
   * Returned to every code-holder by `fetch_game`, which is why it cannot be
   * the credential that proves you opened the table - see the host secret in
   * seatClaim.utils.
   */
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
 * Only the HOST's own URL carries them now, and both halves of that changed in
 * one go: the edition used to matter to a guest too, because seat tokens came
 * from `theme.tokenCatalog` and a guest on the wrong edition sent an id the
 * host's board had no piece for - the palette is shared, so that cannot happen
 * - and only the host can start a game, so nobody else needs to know what kind
 * of game it will be. The invite link is `#/join?code=…` and carries neither.
 */
export interface TableOptions {
  themeId: string;
  useSpeedDie: boolean;
}
