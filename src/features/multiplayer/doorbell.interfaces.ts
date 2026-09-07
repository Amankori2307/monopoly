/**
 * The "somebody moved" notification: a revision number and nothing else.
 *
 * The state itself always comes from `fetch_game`, so this is a hint, never a
 * payload - which is why a missed bell is survivable and a spoofed one is
 * harmless.
 */
export interface Doorbell {
  /** Called for every revision heard. Returns the unsubscribe. */
  onRing: (listener: (revision: number) => void) => () => void;
  /** Tell the other devices. Never throws - the move is already stored. */
  ring: (revision: number) => Promise<void>;
  close: () => void;
}
