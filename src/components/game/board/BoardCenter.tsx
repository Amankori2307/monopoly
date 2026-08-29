import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface BoardCenterProps {
  title: string;
  subtitle: string;
}

/** Decorative middle of the board: deck markers and the logo ribbon. */
export function BoardCenter({ title, subtitle }: BoardCenterProps) {
  return (
    <div className="board-center" data-testid={TEST_IDS.boardCenter}>
      <div className="deck-marker community-deck" aria-hidden="true">
        <span>Community</span>
        <strong>Chest</strong>
      </div>
      <div className="deck-marker chance-deck" aria-hidden="true">
        <strong>?</strong>
        <span>Chance</span>
      </div>
      <div className="board-logo-ribbon" aria-label={`${title} ${subtitle}`}>
        <span>{title}</span>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}
