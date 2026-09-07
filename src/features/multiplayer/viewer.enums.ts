/** What kind of participant this device is. */
export enum ViewerKind {
  /**
   * One browser playing every seat. A union member rather than a flag, because
   * "controls everything" is a different fact from "controls seat X" and
   * collapsing the two is what makes the auction case go wrong.
   */
  HotSeat = 'hot-seat',
  /** Holds one seat at an online table. */
  Seated = 'seated',
  /** Watching. Every failure to resolve a seat degrades to this. */
  Spectator = 'spectator',
}

/** What the table looks like from this device, for the connection banner. */
export enum ConnectionState {
  Offline = 'offline',
  Connecting = 'connecting',
  Live = 'live',
  /** Reachable but behind - a publish was refused, or the poll is carrying it. */
  Degraded = 'degraded',
}
