import {
  getBoardCellCenter,
  getTokenCrowdOffset,
} from '../../../domain/board/boardLayout.utils';
import type { PlayerState, ThemeToken } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { TokenPositions } from './board.interfaces';

interface BoardTokenLayerProps {
  findToken: (tokenId: string) => ThemeToken | undefined;
  players: PlayerState[];
  positions: TokenPositions;
}

/**
 * Player tokens, drawn over the board rather than inside the space cells.
 *
 * Each token is positioned absolutely at its space's centre, so moving between
 * spaces is a real transition rather than a jump between grid cells. Tokens
 * used to live in the cell's flow, which made an occupied cell taller than its
 * neighbours and shifted the board.
 */
export function BoardTokenLayer({ findToken, players, positions }: BoardTokenLayerProps) {
  const occupants = new Map<number, number>();

  return (
    <div className="board-token-layer" data-testid={TEST_IDS.boardTokenLayer}>
      {players.map((player) => {
        const space = positions[player.id] ?? player.position;
        const { leftPercent, topPercent } = getBoardCellCenter(space);

        // Cluster tokens that share a space so none is hidden behind another.
        const crowdIndex = occupants.get(space) ?? 0;
        occupants.set(space, crowdIndex + 1);
        const { leftOffset, topOffset } = getTokenCrowdOffset(crowdIndex);

        const token = findToken(player.tokenId);

        return (
          <span
            aria-label={player.name}
            className="token-chip"
            data-testid={scopedTestId(TEST_IDS.spacePlayerToken, player.id)}
            key={player.id}
            role="img"
            // Base colour inline; the sphere shading is colour-agnostic CSS.
            style={{
              left: `${leftPercent + leftOffset}%`,
              top: `${topPercent + topOffset}%`,
              backgroundColor: token?.color,
            }}
            title={player.name}
          />
        );
      })}
    </div>
  );
}
