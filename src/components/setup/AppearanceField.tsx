import {
  APPEARANCES,
  type AppearanceId,
} from '../../shared/constants/appearance.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface AppearanceFieldProps {
  appearance: AppearanceId;
  onChange: (value: AppearanceId) => void;
}

/**
 * Which palette the board is drawn in.
 *
 * Deliberately outside the identity field grid, and labelled as a display
 * preference: the ruleset beside it is part of the game being created, and this
 * is not. It applies the moment it changes and is remembered on this device,
 * for every game - so putting it in the form would suggest it were being saved
 * with this one.
 */
export function AppearanceField({ appearance, onChange }: AppearanceFieldProps) {
  return (
    <label className="appearance-field">
      Appearance
      <select
        className="select-input"
        data-testid={TEST_IDS.appearanceSelect}
        onChange={(event) => onChange(event.target.value as AppearanceId)}
        value={appearance}
      >
        {APPEARANCES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="helper-text">
        How the board looks. Remembered on this device, for every game.
      </span>
    </label>
  );
}
