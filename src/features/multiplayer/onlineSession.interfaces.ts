import type { OnlineConfig } from './onlineConfig.interfaces';

/** What an online session needs to know to reach one game. */
export interface OnlineSessionOptions {
  config: OnlineConfig;
  gameId: string;
  /** The capability. Holding it is what lets a device read and write this game. */
  joinCode: string;
  /** Which seat this device publishes as, recorded in the audit log. */
  seatId: string | null;
}
