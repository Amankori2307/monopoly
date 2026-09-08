import { Link } from 'react-router-dom';
import type { GameState } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { ActivityButton } from '../overlays/ActivityButton';
import { CommandErrorBanner } from '../panels/CommandErrorBanner';
import { ToastStack } from '../overlays/ToastStack';
import { PlayersPanel } from '../panels/PlayersPanel';
import { TurnControls } from '../panels/TurnControls';
import type { PlayerSummary } from '../panels/panels.interfaces';
import type { Toast } from '../overlays/overlays.interfaces';

interface GameSidebarProps {
  bannerProps: Parameters<typeof CommandErrorBanner>[0];
  canEndTurn: boolean;
  canRoll: boolean;
  connectedSeatIds: ReadonlySet<string>;
  currencySymbol: string;
  /** Which palette the board is drawn in, named on its own control. */
  appearanceLabel: string;
  /** Size of the game history, shown on the activity button. */
  eventCount: number;
  onDismissToast: (id: string) => void;
  onEndTurn: () => void;
  onCycleAppearance: () => void;
  onOpenActivity: () => void;
  onRoll: () => void;
  onSelectPlayer: (playerId: string) => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
  summaries: PlayerSummary[];
  toastDismissAfterMs: number;
  toasts: Toast[];
  turn: GameState['turn'];
}

/**
 * The column beside the board: who is playing, what went wrong, the toasts and
 * the dice.
 *
 * Extracted from GamePage, which had grown past its line limit for the third
 * time as the online work added a banner, presence and a roll id. It is a real
 * seam rather than padding - everything here is the sidebar's own, and the page
 * is now the board, this, and the overlays.
 */
export function GameSidebar({
  appearanceLabel,
  bannerProps,
  canEndTurn,
  canRoll,
  connectedSeatIds,
  currencySymbol,
  eventCount,
  onCycleAppearance,
  onDismissToast,
  onEndTurn,
  onOpenActivity,
  onRoll,
  onSelectPlayer,
  onToggleSound,
  soundEnabled,
  summaries,
  toastDismissAfterMs,
  toasts,
  turn,
}: GameSidebarProps) {
  return (
    <aside className="game-side" data-testid={TEST_IDS.gameSidebar}>
      <PlayersPanel
        currencySymbol={currencySymbol}
        onSelectPlayer={onSelectPlayer}
        connectedSeatIds={connectedSeatIds}
        summaries={summaries}
      />

      <div className="game-side-scroll">
        {/* One banner, not two: a second would fight this one for the
              strip above the decision backdrop, the only place either is
              visible while a modal is up. A connection problem wins the
              slot - it explains why nothing works at all - and it clears
              itself, so there is nothing to dismiss. */}
        <CommandErrorBanner {...bannerProps} />

        <div className="button-row">
          <Link className="secondary-button" to="/">
            Home
          </Link>
          <Link className="secondary-button" to="/rules">
            Rules
          </Link>
          {/* Beside the other two rather than tucked away: nine sounds
                need an off switch a player can find. */}
          <button
            aria-pressed={!soundEnabled}
            className="secondary-button"
            data-testid={TEST_IDS.soundToggle}
            onClick={onToggleSound}
            title={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
            type="button"
          >
            {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
          </button>

          {/* Beside the sound switch, for the same reason: a look worth
                choosing is worth changing without leaving the game.

                The name is dropped on a phone, and that is not cosmetic. With
                it, this row wrapped to a second line - and the second line of
                a scroll region whose last child is a sticky bar sits exactly
                behind that bar, so the control was invisible until you
                scrolled. The full text stays in the accessible name. */}
          <button
            aria-label={`Appearance: ${appearanceLabel}. Change how the board looks.`}
            className="secondary-button"
            data-testid={TEST_IDS.appearanceToggle}
            onClick={onCycleAppearance}
            title={`Appearance: ${appearanceLabel}`}
            type="button"
          >
            <span aria-hidden="true">◐</span>
            <span className="appearance-toggle-label">{appearanceLabel}</span>
          </button>
        </div>
      </div>

      {/*
          The toasts and the dice travel together. `display: contents` keeps
          this wrapper invisible to the desktop layout, so the margin-top:auto
          on .toast-stack still pins the pair to the bottom of the column; on a
          phone it becomes one sticky bar. Separating them would let a toast
          scroll away from the move it is reporting.
        */}
      <div className="game-side-footer">
        {/*
            In the sidebar's own flow, immediately above the dice. Floating it
            over the board meant it always covered something - first the dice
            themselves, then the deed card and the board's left column. Here it
            occupies space nothing else wants.
          */}
        <ToastStack
          dismissAfterMs={toastDismissAfterMs}
          onDismiss={onDismissToast}
          toasts={toasts}
        />

        <TurnControls
          soundEnabled={soundEnabled}
          canEndTurn={canEndTurn}
          // Not while a token is walking. A double puts the turn straight
          // into AwaitExtraRollOrEnd, so Roll went live mid-walk - and the
          // second roll then restarted the walk from wherever the token had
          // got to, cutting both legs short.
          canRoll={canRoll}
          canRollAgain={turn.canRollAgain}
          // Floating over the board on desktop, in the bar on a phone. It is
          // rendered here rather than with the other overlays because a
          // `position: fixed` element ignores its DOM position, so this move
          // changes nothing above the phone breakpoint - and below it the
          // button simply becomes static and lands in the row.
          leading={<ActivityButton eventCount={eventCount} onOpen={onOpenActivity} />}
          speedDieFace={turn.speedDieFace}
          lastRoll={turn.lastRoll}
          lastRollId={turn.lastRollId}
          onEndTurn={onEndTurn}
          onRoll={onRoll}
          rollLabel="Roll dice"
        />
      </div>
    </aside>
  );
}
