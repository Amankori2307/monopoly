import diceRollSound from '../../../assets/audio/dice-roll.wav';
import type { GameState } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { DicePair } from '../DicePair';
import { useDiceRoller } from '../hooks/useDiceRoller';
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
  onDismissToast: (id: string) => void;
  onEndTurn: () => void;
  onRoll: () => void;
  onSelectPlayer: (playerId: string) => void;
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
  bannerProps,
  canEndTurn,
  canRoll,
  connectedSeatIds,
  currencySymbol,
  onDismissToast,
  onEndTurn,
  onRoll,
  onSelectPlayer,
  soundEnabled,
  summaries,
  toastDismissAfterMs,
  toasts,
  turn,
}: GameSidebarProps) {
  // ONE roller for the whole screen. The faces are drawn twice - in the dock
  // and in the phone HUD's middle column - and the hook plays the roll sound
  // itself, so a second call would sound every throw twice. CLAUDE.md is
  // explicit that a half-muted game is worse than none, and this is the same
  // rule from the other side.
  const dice = useDiceRoller({
    canRoll,
    lastRoll: turn.lastRoll,
    lastRollId: turn.lastRollId,
    onRoll,
    soundEnabled,
    soundSrc: diceRollSound,
  });

  return (
    <aside className="game-side" data-testid={TEST_IDS.gameSidebar}>
      <PlayersPanel
        currencySymbol={currencySymbol}
        onSelectPlayer={onSelectPlayer}
        connectedSeatIds={connectedSeatIds}
        summaries={summaries}
        /*
          The phone HUD's middle column: two columns of player cards with the
          dice between them, as the reference boards have it. Hidden above the
          phone tier, where the dock beside the board owns the faces instead.
          A slot rather than a child of PlayersPanel's own making, because the
          dice belong to the turn, not to the players.
        */
        centre={
          <DicePair
            displayValues={dice.displayValues}
            isRolling={dice.isRolling}
            scope="hud"
            speedDieFace={turn.speedDieFace}
          />
        }
      />

      <div className="game-side-scroll">
        {/* One banner, not two: a second would fight this one for the
              strip above the decision backdrop, the only place either is
              visible while a modal is up. A connection problem wins the
              slot - it explains why nothing works at all - and it clears
              itself, so there is nothing to dismiss. */}
        <CommandErrorBanner {...bannerProps} />
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
          canEndTurn={canEndTurn}
          // Not while a token is walking. A double puts the turn straight
          // into AwaitExtraRollOrEnd, so Roll went live mid-walk - and the
          // second roll then restarted the walk from wherever the token had
          // got to, cutting both legs short.
          canRoll={canRoll}
          canRollAgain={turn.canRollAgain}
          dice={dice}
          speedDieFace={turn.speedDieFace}
          onEndTurn={onEndTurn}
          rollLabel="Roll dice"
        />
      </div>
    </aside>
  );
}
