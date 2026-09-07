/**
 * A seat, as the lobby components need to draw one.
 *
 * Declared here rather than imported from `features/multiplayer`, because a
 * presentational component may not reach into a feature - the lint rule that
 * refused it is the layer boundary doing its job. The feature's own `LobbySeat`
 * satisfies this structurally, so there is no mapping to keep in step.
 */
export interface LobbySeatView {
  seatId: string;
  name: string;
  tokenId: string;
}
