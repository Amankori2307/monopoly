import { MAX_JAIL_TURNS } from '../../../domain/constants/game.constants';
import type { PlayerState } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';

interface PlayerBadgesProps {
  /**
   * Mortgage state is not on PlayerState - it is derived from ownership, so the
   * caller passes the count it already has on PlayerSummary.
   */
  mortgagedCount: number;
  player: PlayerState;
}

interface Badge {
  id: string;
  label: string;
  title: string;
  tone: 'jail' | 'card' | 'bankrupt' | 'mortgaged';
}

/**
 * Status that only matters when it is true, so it reads as a badge rather than
 * a permanent row. Position was a metric nobody acts on; a held jail card is.
 */
const badgesFor = (player: PlayerState, mortgagedCount: number): Badge[] => {
  const badges: Badge[] = [];

  if (player.isBankrupt) {
    badges.push({
      id: 'bankrupt',
      label: 'Bankrupt',
      title: 'Out of the game',
      tone: 'bankrupt',
    });
  }

  if (player.inJail) {
    badges.push({
      id: 'jail',
      label: `In jail ${player.jailTurnsServed}/${MAX_JAIL_TURNS}`,
      title: `Turns served: ${player.jailTurnsServed} of ${MAX_JAIL_TURNS}`,
      tone: 'jail',
    });
  }

  if (player.jailFreeCards.length > 0) {
    badges.push({
      id: 'jail-free',
      label:
        player.jailFreeCards.length > 1
          ? `Jail card x${player.jailFreeCards.length}`
          : 'Jail card',
      title: 'Get Out of Jail Free card held',
      tone: 'card',
    });
  }

  if (mortgagedCount > 0) {
    badges.push({
      id: 'mortgaged',
      label: mortgagedCount > 1 ? `${mortgagedCount} mortgaged` : '1 mortgaged',
      title: 'Mortgaged sites collect no rent until they are redeemed',
      tone: 'mortgaged',
    });
  }

  return badges;
};

export function PlayerBadges({ mortgagedCount, player }: PlayerBadgesProps) {
  const badges = badgesFor(player, mortgagedCount);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="player-badges">
      {badges.map((badge) => (
        <span
          className={`player-badge badge-${badge.tone}`}
          data-testid={scopedTestId(TEST_IDS.playerBadge, badge.id)}
          key={badge.id}
          title={badge.title}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
