import type { SpaceOwnerMark } from '../../components/game/board/board.interfaces';
import type { GameState, ThemeToken } from '../../domain/types/game.interfaces';

/**
 * Who owns what, in the shape the board needs to paint it.
 *
 * The board only ever needed a colour and a flag per space, so it takes this
 * rather than the whole ownership record plus the token catalogue - keeping
 * BoardSpaceCell presentational.
 */
export const selectSpaceOwnerMarks = (
  game: GameState,
  findToken: (tokenId: string) => ThemeToken | undefined
): Record<string, SpaceOwnerMark> => {
  const marks: Record<string, SpaceOwnerMark> = {};

  Object.entries(game.ownership).forEach(([spaceId, ownership]) => {
    const ownerPlayerId = ownership.ownerPlayerId;
    if (!ownerPlayerId) {
      return;
    }
    const owner = game.players[ownerPlayerId];
    if (!owner) {
      return;
    }
    marks[spaceId] = {
      color: findToken(owner.tokenId)?.color ?? '',
      mortgaged: ownership.mortgaged,
      ownerName: owner.name,
      buildLevel: ownership.buildLevel ?? 0,
    };
  });

  return marks;
};
