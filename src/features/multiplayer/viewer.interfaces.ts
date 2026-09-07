import type { PlayerId } from '../../domain/types/game.interfaces';
import type { ViewerKind } from './viewer.enums';

/** Who is looking at this screen, and what they are allowed to touch. */
export type Viewer =
  | { kind: ViewerKind.HotSeat }
  | { kind: ViewerKind.Seated; playerId: PlayerId }
  | { kind: ViewerKind.Spectator };
