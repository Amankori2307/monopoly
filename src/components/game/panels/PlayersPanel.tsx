import { useState } from 'react';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import type { PlayerSummary } from './panels.interfaces';

interface PlayersPanelProps {
  currencySymbol: string;
  summaries: PlayerSummary[];
}

/**
 * Bare card stack - no panel, no heading.
 *
 * Order carries the meaning: `selectPlayerSummaries` puts the active player
 * first, so the card on top of the stack is whose turn it is. Clicking the stack
 * expands it into a list; the collapse control appears only once expanded.
 */
export function PlayersPanel({ currencySymbol, summaries }: PlayersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggle = () => setIsExpanded((expanded) => !expanded);

  return (
    <div className="player-stack-region" data-testid={TEST_IDS.playersPanel}>
      <div
        className={`player-stack ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
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

        {summaries.map(({ player, token, propertyCount }) => (
          <article
            className="player-card"
            data-testid={scopedTestId(TEST_IDS.playerCard, player.id)}
            key={player.id}
            style={{ borderLeftColor: token?.color }}
          >
            {/* Colour strip: the only thing visible on a collapsed sliver. */}
            <span
              aria-hidden="true"
              className="player-card-strip"
              style={{ background: token?.color }}
            />
            <strong>
              {token?.emoji} {player.name}
            </strong>
            <div className="player-metrics">
              <span>Cash</span>
              <strong>{formatMoney(player.cash, currencySymbol)}</strong>
              <span>Properties</span>
              <strong>{propertyCount}</strong>
              <span>Position</span>
              <strong>{player.position}</strong>
              <span>Jail</span>
              <strong>{player.inJail ? `Yes (${player.jailTurnsServed})` : 'No'}</strong>
            </div>
          </article>
        ))}
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
