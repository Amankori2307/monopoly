import type {
  BoardSpace,
  PlayerState,
  ThemeToken,
} from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { BoardCenter } from './BoardCenter';
import { BoardSpaceCell } from './BoardSpaceCell';

interface BoardGridProps {
  board: BoardSpace[];
  centerTitle: string;
  centerSubtitle: string;
  findToken: (tokenId: string) => ThemeToken | undefined;
  onSelectSpace: (spaceId: string) => void;
  playersByPosition: Map<number, PlayerState[]>;
}

const NO_PLAYERS: PlayerState[] = [];

export function BoardGrid({
  board,
  centerTitle,
  centerSubtitle,
  findToken,
  onSelectSpace,
  playersByPosition,
}: BoardGridProps) {
  return (
    <section className="board-card panel">
      <div className="board-grid" data-testid={TEST_IDS.boardGrid}>
        <BoardCenter subtitle={centerSubtitle} title={centerTitle} />
        {board.map((space) => (
          <BoardSpaceCell
            findToken={findToken}
            key={space.id}
            onSelect={onSelectSpace}
            playersOnSpace={playersByPosition.get(space.index) ?? NO_PLAYERS}
            space={space}
          />
        ))}
      </div>
    </section>
  );
}
