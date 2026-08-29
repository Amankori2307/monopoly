import type {
  BoardSpace,
  PlayerState,
  ThemeToken,
} from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { TokenPositions } from '../hooks/useAnimatedTokenPositions';
import { BoardCenter } from './BoardCenter';
import { BoardSpaceCell } from './BoardSpaceCell';
import { BoardTokenLayer } from './BoardTokenLayer';

interface BoardGridProps {
  board: BoardSpace[];
  centerTitle: string;
  centerSubtitle: string;
  findToken: (tokenId: string) => ThemeToken | undefined;
  onSelectSpace: (spaceId: string) => void;
  players: PlayerState[];
  /** Display positions, which lag the engine while a token walks. */
  tokenPositions: TokenPositions;
}

export function BoardGrid({
  board,
  centerTitle,
  centerSubtitle,
  findToken,
  onSelectSpace,
  players,
  tokenPositions,
}: BoardGridProps) {
  const occupied = new Set(Object.values(tokenPositions));

  return (
    <section className="board-card panel">
      <div className="board-grid" data-testid={TEST_IDS.boardGrid}>
        <BoardCenter subtitle={centerSubtitle} title={centerTitle} />
        {board.map((space) => (
          <BoardSpaceCell
            isOccupied={occupied.has(space.index)}
            key={space.id}
            onSelect={onSelectSpace}
            space={space}
          />
        ))}
        <BoardTokenLayer
          findToken={findToken}
          players={players}
          positions={tokenPositions}
        />
      </div>
    </section>
  );
}
