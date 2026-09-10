import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import { ColorGroupPips } from './ColorGroupPips';
import type { PlayerSummary } from './panels.interfaces';
import { PlayerBadges } from './PlayerBadges';

interface PlayerCardProps {
  currencySymbol: string;
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
  onOpen,
  summary,
  isAway = false,
}: PlayerCardProps) {
  const {
    player,
    token,
    propertyCount,
    netWorth,
    mortgagedCount,
    setProgress,
    isActive,
    seatIndex,
  } = summary;

  return (
    <article
      className={`player-card ${isActive ? 'is-active' : ''} ${isAway ? 'is-away' : ''}`}
      data-away={isAway ? 'true' : undefined}
      // Where they sit, which is not where they are in the DOM. The phone grid
      // orders by this so a player keeps their cell all game; DOM order stays
      // turn order, which is what the desktop fan reads.
      data-seat={seatIndex}
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

      {/* The phone card's second line, and its whole second half: at ~115px
          wide there is room for a name and one figure, and cash is the one a
          player checks. Everything hidden with it - net worth, the owned
          count, the set pips - is in the holdings drawer the card opens.
          display:none on desktop, where the list below already says Cash. */}
      <p
        className="player-card-cash"
        data-testid={scopedTestId(TEST_IDS.playerCash, player.id)}
      >
        {formatMoney(player.cash, currencySymbol)}
      </p>

      {/* A description list, so each label is tied to its own figure rather
          than to a position in a flat grid. */}
      <dl className="player-metrics">
        <div>
          <dt>Cash</dt>
          <dd>{formatMoney(player.cash, currencySymbol)}</dd>
        </div>
        <div>
          {/* Not 'Sites': propertyCount is every ownable square, railways
              and utilities included, so a street-word was wrong on every
              board - and 'site' is the codebase's own word for a street, not
              any edition's. */}
          <dt>Owned</dt>
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
        paints above the content it covers.

        No tabIndex: it used to be driven by an `isInteractive` prop so a
        collapsed sliver stayed out of the tab order, but the stylesheet
        already does that with `display: none` on a sliver's button - which
        removes it from the tab order AND the accessibility tree. Keeping the
        prop made every card on a phone `tabIndex={-1}`, because the stack is
        never expanded there, which is a keyboard-unreachable HUD.
      */}
      <button
        aria-label={`View ${player.name} holdings`}
        className="player-card-open"
        onClick={() => onOpen(player.id)}
        type="button"
      >
        <span aria-hidden="true" className="player-card-chevron">
          ›
        </span>
      </button>
    </article>
  );
}
