/**
 * A seat, as the lobby components need to draw one.
 *
 * Declared here rather than imported from `features/multiplayer`, because a
 * presentational component may not reach into a feature - the lint rule that
 * refused it is the layer boundary doing its job.
 */
export interface LobbySeatView {
  /** Also the player id once the game exists. */
  seatId: string;
  name: string;
  /**
   * Already resolved, for the same reason `PlayerSummary` carries one: the
   * colour comes from the seat's INDEX, and turning `player-3` into a palette
   * entry is `seatIndexOf`, which lives in the feature layer.
   */
  color: string;
}
