import { boardIndexToGridPosition } from '../../../domain/board/boardLayout.utils';
import type { PlayerState, ThemeToken } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { TokenPositions } from '../hooks/useAnimatedTokenPositions';

interface BoardTokenLayerProps {
  findToken: (tokenId: string) => ThemeToken | undefined;
  players: PlayerState[];
  positions: TokenPositions;
}

/**
 * Player tokens, drawn over the board rather than inside the space cells.
 *
 * Tokens used to live in the cell's flow, so landing on a space made that cell
 * taller than its neighbours and shifted the board. This layer shares the
 * board's grid template, so a token is placed by grid cell - no pixel maths -
 * and cannot affect any cell's size.
 */
export function BoardTokenLayer({ findToken, players, positions }: BoardTokenLayerProps) {
  const byCell = new Map<string, PlayerState[]>();

  for (const player of players) {
    const position = positions[player.id] ?? player.position;
    const { row, column } = boardIndexToGridPosition(position);
    const key = `${row}:${column}`;
    const existing = byCell.get(key);
    if (existing) {
      existing.push(player);
    } else {
      byCell.set(key, [player]);
    }
  }

  return (
    <div className="board-token-layer" data-testid={TEST_IDS.boardTokenLayer}>
      {Array.from(byCell.entries()).map(([key, cellPlayers]) => {
        const [row, column] = key.split(':').map(Number);
        return (
          <div
            className="board-token-cell"
            key={key}
            style={{ gridRow: row, gridColumn: column }}
          >
            {cellPlayers.map((player) => (
              <span
                className="token-chip"
                data-testid={scopedTestId(TEST_IDS.spacePlayerToken, player.id)}
                key={player.id}
                title={player.name}
              >
                {findToken(player.tokenId)?.emoji ?? player.name.charAt(0)}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
