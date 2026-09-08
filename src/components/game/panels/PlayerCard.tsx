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
  /** True when this seat's device is not connected. Never true locally. */
  isAway?: boolean;
}

/**
 * One player at a glance: what they are worth, what they hold, and how close
 * they are to a colour set. Clicking opens their full holdings.
 *
 * Four numbers do not need four rows. This used to stack the name, a labelled
 * net worth, and then cash and sites one per line - about 300px of card on a
 * phone for a name and three figures, because `.player-metrics` shared the
 * generic two-column grid that collapses to one column below the tablet
 * breakpoint. The header now pairs the name with the headline figure on one
 * line and the secondary metrics run inline beneath it.
 */
export function PlayerCard({
  currencySymbol,
  isInteractive,
  onOpen,
  summary,
  isAway = false,
}: PlayerCardProps) {
  const { player, token, propertyCount, netWorth, mortgagedCount, setProgress } = summary;

  return (
    <article
      className={`player-card ${isAway ? 'is-away' : ''}`}
      data-away={isAway ? 'true' : undefined}
      data-testid={scopedTestId(TEST_IDS.playerCard, player.id)}
      style={{ borderLeftColor: token?.color }}
    >
      {/* Colour strip: the only thing visible on a collapsed sliver. */}
      <span
        aria-hidden="true"
        className="player-card-strip"
        style={{ background: token?.color }}
      />

      <div className="player-card-head">
        <strong className="player-card-name">
          {token?.emoji} {player.name}
        </strong>

        {/* Net worth leads: cash alone misleads when a player is property-rich.
            It keeps its label because the card also shows cash, and the two are
            the same number until somebody buys something. */}
        <span className="player-card-worth">
          <span className="eyebrow">Net worth</span>
          <strong data-testid={scopedTestId(TEST_IDS.playerNetWorth, player.id)}>
            {formatMoney(netWorth, currencySymbol)}
          </strong>
        </span>
      </div>

      {/* A description list, so each label is tied to its own figure rather
          than to a position in a flat grid. */}
      <dl className="player-metrics">
        <div>
          <dt>Cash</dt>
          <dd>{formatMoney(player.cash, currencySymbol)}</dd>
        </div>
        <div>
          <dt>Sites</dt>
          {/* The mortgaged count used to be appended here as text. It is a badge
              now, so saying it twice on one card would be noise. */}
          <dd data-testid={scopedTestId(TEST_IDS.playerSiteCount, player.id)}>
            {propertyCount}
          </dd>
        </div>
      </dl>

      <ColorGroupPips progress={setProgress} />
      <PlayerBadges mortgagedCount={mortgagedCount} player={player} />

      {/*
        The whole card is the target, and the chevron is what says so.
        This was an EMPTY unstyled button with no rules anywhere, so it rendered
        as a tiny default browser pill in the corner of the card - a control
        that looked like a rendering artefact. Rendered last so the overlay
        paints above the content it covers; while the stack is collapsed the
        stack's own expand overlay sits above this one, which is what tabIndex
        is tracking.
      */}
      <button
        aria-label={`View ${player.name} holdings`}
        className="player-card-open"
        onClick={() => onOpen(player.id)}
        tabIndex={isInteractive ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true" className="player-card-chevron">
          ›
        </span>
      </button>
    </article>
  );
}
