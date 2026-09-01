import { SPEED_DIE_BONUS_CASH } from '../../domain/constants/game.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { formatMoney } from '../../shared/utils/money.utils';

interface SpeedDieToggleProps {
  currencySymbol: string;
  isEnabled: boolean;
  onChange: (isEnabled: boolean) => void;
}

/**
 * The one optional ruleset choice at setup.
 *
 * Agreed before the game starts and fixed for its lifetime - there is
 * deliberately no way to switch it on mid-game, which is the printed rule and
 * also what keeps the starting bonus honest.
 */
export function SpeedDieToggle({
  currencySymbol,
  isEnabled,
  onChange,
}: SpeedDieToggleProps) {
  return (
    <label className="checkbox-field">
      <input
        checked={isEnabled}
        data-testid={TEST_IDS.speedDieToggle}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        Play with the Speed Die
        <span className="helper-text">
          A third die, from the moment every player has passed GO once. Each player starts
          with an extra {formatMoney(SPEED_DIE_BONUS_CASH, currencySymbol)}.
        </span>
      </span>
    </label>
  );
}
