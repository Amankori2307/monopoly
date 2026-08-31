import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import { ColorGroupPips } from './ColorGroupPips';
import type { PlayerSummary } from './panels.interfaces';
import { PlayerBadges } from './PlayerBadges';

interface PlayerCardProps {
  currencySymbol: string;
  /** Whether the card's own controls are reachable, i.e. the stack is expanded. */
  isInteractive: boolean;
  onOpen: (playerId: string) => void;
  summary: PlayerSummary;
}

/**
 * One player at a glance: what they are worth, what they hold, and how close
 * they are to a colour set. Clicking opens their full holdings.
 */
export function PlayerCard({
  currencySymbol,
  isInteractive,
  onOpen,
  summary,
}: PlayerCardProps) {
  const { player, token, propertyCount, netWorth, mortgagedCount, setProgress } = summary;

  return (
    <article
      className="player-card"
      data-testid={scopedTestId(TEST_IDS.playerCard, player.id)}
      style={{ borderLeftColor: token?.color }}
    >
      {/* Colour strip: the only thing visible on a collapsed sliver. */}
      <span
        aria-hidden="true"
        className="player-card-strip"
        style={{ background: token?.color }}
      />

      {/* Only reachable once expanded; the overlay covers it while collapsed. */}
      <button
        aria-label={`View ${player.name} holdings`}
        className="player-card-open"
        onClick={() => onOpen(player.id)}
        tabIndex={isInteractive ? 0 : -1}
        type="button"
      />

      <strong className="player-card-name">
        {token?.emoji} {player.name}
      </strong>

      {/* Net worth leads: cash alone misleads when a player is property-rich. */}
      <div className="player-card-worth">
        <span className="eyebrow">Net worth</span>
        <strong data-testid={scopedTestId(TEST_IDS.playerNetWorth, player.id)}>
          {formatMoney(netWorth, currencySymbol)}
        </strong>
      </div>

      <div className="player-metrics">
        <span>Cash</span>
        <strong>{formatMoney(player.cash, currencySymbol)}</strong>
        <span>Sites</span>
        {/* The mortgaged count used to be appended here as text. It is a badge
            now, so saying it twice on one card would be noise. */}
        <strong data-testid={scopedTestId(TEST_IDS.playerSiteCount, player.id)}>
          {propertyCount}
        </strong>
      </div>

      <ColorGroupPips progress={setProgress} />
      <PlayerBadges mortgagedCount={mortgagedCount} player={player} />
    </article>
  );
}
