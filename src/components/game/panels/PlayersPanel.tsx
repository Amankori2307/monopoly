import { useState } from 'react';
import type { PlayerId } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerSummary } from './panels.interfaces';
import { PlayerCard } from './PlayerCard';

interface PlayersPanelProps {
  currencySymbol: string;
  onSelectPlayer: (playerId: PlayerId) => void;
  summaries: PlayerSummary[];
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
  currencySymbol,
  onSelectPlayer,
  summaries,
}: PlayersPanelProps) {
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

        {summaries.map((summary) => (
          <PlayerCard
            currencySymbol={currencySymbol}
            isInteractive={isExpanded}
            key={summary.player.id}
            onOpen={onSelectPlayer}
            summary={summary}
          />
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
