import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerActionRow } from './panels.interfaces';

interface PlayerActionRailProps {
  onPick: (row: PlayerActionRow) => void;
  rows: PlayerActionRow[];
}

/**
 * Build, Sell, Mortgage, Redeem, Trade - under the board, always there.
 *
 * A rail like this existed once and was removed, for a reason recorded in
 * pages/_game.scss: "every action it listed needs a spaceId, and the site
 * panel is where one exists". That objection is answered rather than worked
 * around - tapping a button opens a picker listing exactly the sites the
 * command will accept, and the spaceId comes from there.
 *
 * Every button is always present, so the row never changes shape mid-game, and
 * a disabled one says why in the same sentence the engine would refuse with:
 * `getPlayerActionOptions` derives both from the per-site rules, so a live
 * button is always a command that will succeed.
 */
export function PlayerActionRail({ onPick, rows }: PlayerActionRailProps) {
  return (
    <nav
      aria-label="Property actions"
      className="action-rail"
      data-testid={TEST_IDS.actionRail}
    >
      {rows.map((row) => (
        <button
          aria-label={row.accessibleName}
          className="secondary-button is-fill"
          data-testid={`${TEST_IDS.actionRailButton}-${row.action ?? 'trade'}`}
          disabled={!row.isEnabled}
          key={row.action ?? 'trade'}
          onClick={() => onPick(row)}
          title={row.disabledReason || undefined}
          type="button"
        >
          {row.label}
        </button>
      ))}
    </nav>
  );
}
