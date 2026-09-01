import { Link } from 'react-router-dom';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';

interface GameOverDecisionProps {
  winnerName: string;
}

/**
 * The end of the game.
 *
 * Unlike every other decision this one has nothing to answer - the engine
 * rejects all commands once the game is complete. It offers a way back to the
 * game list instead, because the decision modal cannot be dismissed.
 */
export function GameOverDecision({ winnerName }: GameOverDecisionProps) {
  return (
    <div className="game-over" data-testid={TEST_IDS.gameOverDecision}>
      <p className="eyebrow">Game over</p>
      <h2>{winnerName} wins</h2>
      <p className="game-over-lede">
        Every other player is bankrupt. This game is complete and takes no further turns.
      </p>
      <Link className="primary-button" data-testid={TEST_IDS.gameOverHome} to="/">
        Back to games
      </Link>
    </div>
  );
}
