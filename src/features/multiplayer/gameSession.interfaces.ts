import type { GameState, RuntimeGameCommand } from '../../domain/types/game.interfaces';

/**
 * What happened to a state this device tried to publish.
 *
 * A conflict is not a failure: somebody else moved first, and `game` is what is
 * actually true. The caller adopts it and does NOT replay the command - putting
 * a bid of 200 back on top of a 250 that already landed is the classic way to
 * corrupt a shared game.
 */
export type PublishOutcome =
  | { status: 'accepted'; revision: number }
  | { status: 'conflict'; revision: number; game: GameState }
  | { status: 'gone' }
  | { status: 'failed'; message: string };

/** What the app is told when a state arrives from somewhere else. */
export interface RemoteGameUpdate {
  revision: number;
  game: GameState;
}

/**
 * The seam between the game and wherever its state lives.
 *
 * `LocalSession` is a no-op that reports every publish accepted, so a hot-seat
 * game runs through exactly the same code path as an online one and neither
 * has a branch the other does not. Everything here returns a promise; nothing
 * in the command path awaits one.
 */
export interface GameSession {
  /**
   * Which game this session is attached to; null for the local session.
   *
   * It exists so a caller can ask "am I already on this table" WITHOUT reading
   * state that attaching itself changes - `sessionEpoch`, `connection` and
   * `seat.joinCode` are all written by the attach, so an effect keyed on any
   * of them would cancel its own handler. See CLAUDE.md section 8.
   */
  readonly gameId: string | null;
  /** False for the local session, so no online UI is offered for a local game. */
  readonly isOnline: boolean;

  /** Push a state this device has already applied. */
  publish(input: {
    game: GameState;
    baseRevision: number;
    command: RuntimeGameCommand | null;
  }): Promise<PublishOutcome>;

  /** Ask for the authoritative state, on first load, on reconnect, or on a bell. */
  fetch(): Promise<RemoteGameUpdate | null>;

  /**
   * Ring the bell for a write that did not go through `publish` - a seat claim,
   * or the host starting the game.
   *
   * Without it those writes are invisible until somebody's poll comes round,
   * which in a lobby means watching a stale table for up to thirty seconds
   * while your friend wonders why you have not appeared.
   */
  announce(revision: number): Promise<void>;

  /**
   * Who is connected right now, by seat. Returns the unsubscribe.
   *
   * Presence rather than a database column, because a heartbeat must never bump
   * the revision - every device would then wake every other one several times a
   * minute to fetch a state that had not changed.
   */
  onHere(listener: (seatIds: string[]) => void): () => void;

  /**
   * Watch for somebody else's move. Returns the unsubscribe.
   *
   * The callback is given the revision only - the doorbell, not the payload -
   * so the caller decides when to fetch.
   */
  subscribe(onRevision: (revision: number) => void): () => void;

  /** Stop everything. Safe to call twice. */
  close(): void;
}
