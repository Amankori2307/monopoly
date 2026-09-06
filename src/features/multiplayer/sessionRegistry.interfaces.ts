import type { GameSession } from './gameSession.interfaces';

/** Holds the one live session and swaps it when a game goes online or local. */
export interface SessionRegistry {
  current: GameSession;
  /** Swaps the session, closing whatever was there. */
  replace(session: GameSession): void;
  /** Back to hot-seat. Called when a game is closed or left. */
  reset(): void;
}

/** What every thunk in this app receives as its third argument. */
export interface ThunkExtra {
  session: SessionRegistry;
}
