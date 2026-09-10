import { useState, type ReactNode } from 'react';
import type { PlayerId } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerSummary } from './panels.interfaces';
import { PlayerCard } from './PlayerCard';

interface PlayersPanelProps {
  /**
   * Rendered in the middle column of the phone HUD, between the two columns of
   * player cards - the dice, today. Hidden above the phone tier.
   *
   * A `<div>` among `<article>` cards on purpose: the collapsed fan is laid
   * out entirely by `:nth-of-type` on `.player-card`, so a sibling of a
   * different element type is invisible to every one of those rules. That is
   * what lets one DOM serve the desktop fan and the phone grid without a
   * viewport check in JavaScript.
   */
  centre?: ReactNode;
  currencySymbol: string;
  onSelectPlayer: (playerId: PlayerId) => void;
  summaries: PlayerSummary[];
  /**
   * Seats with a device connected right now.
   *
   * Empty means "no presence information" rather than "nobody is here" - a
   * hot-seat game has no such thing, and reading empty as absence would mark
   * every player at a local table as away.
   */
  connectedSeatIds?: ReadonlySet<string>;
}

/**
 * Bare card stack - no panel, no heading.
 *
 * Order carries the meaning: `selectPlayerSummaries` puts the active player
 * first, so the card on top of the stack is whose turn it is.
 *
 * Collapsed, a click anywhere expands the stack. Expanded, each card is its own
 * button that opens that player's details.
 */
export function PlayersPanel({
  centre,
  currencySymbol,
  onSelectPlayer,
  summaries,
  connectedSeatIds,
}: PlayersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggle = () => setIsExpanded((expanded) => !expanded);

  return (
    <div className="player-stack-region" data-testid={TEST_IDS.playersPanel}>
      {/*
        The stack scrolls inside its own box. At eight players an expanded stack
        is taller than the sidebar, and without this it overflowed the column
        and painted straight over the dice and the end-turn button.
      */}
      <div className="player-stack-scroll">
        <div
          className={`player-stack ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
          // The grid's row count comes from the data rather than a guessed
          // `repeat()`, so the middle column can span exactly the rows there
          // are: `1 / -1` cannot be used against implicit rows.
          data-rows={Math.ceil(summaries.length / 2)}
          data-testid={TEST_IDS.playerStack}
        >
          {/*
          Covers the collapsed stack so a click anywhere expands it, while
          keeping a real button for keyboard and screen-reader users.
        */}
          {isExpanded ? null : (
            <button
              aria-expanded={false}
              aria-label={`Show all ${summaries.length} players`}
              className="player-stack-expand"
              data-testid={TEST_IDS.playerStackExpand}
              onClick={toggle}
              type="button"
            />
          )}

          {summaries.map((summary) => (
            <PlayerCard
              currencySymbol={currencySymbol}
              isAway={
                connectedSeatIds !== undefined &&
                connectedSeatIds.size > 0 &&
                !connectedSeatIds.has(summary.player.id)
              }
              key={summary.player.id}
              onOpen={onSelectPlayer}
              summary={summary}
            />
          ))}

          {centre ? (
            <div className="player-stack-centre" data-testid={TEST_IDS.playerStackCentre}>
              {centre}
            </div>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <button
          aria-expanded
          className="player-stack-collapse"
          data-testid={TEST_IDS.playerStackToggle}
          onClick={toggle}
          type="button"
        >
          Collapse
        </button>
      ) : null}
    </div>
  );
}
