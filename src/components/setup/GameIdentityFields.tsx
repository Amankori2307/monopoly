import { availableThemes } from '../../domain/themes/indiaEditionTheme';

interface GameIdentityFieldsProps {
  gameName: string;
  onGameNameChange: (value: string) => void;
  onThemeChange: (value: string) => void;
  themeId: string;
}

/** What the game is called and which theme it wears. */
export function GameIdentityFields({
  gameName,
  onGameNameChange,
  onThemeChange,
  themeId,
}: GameIdentityFieldsProps) {
  return (
    <div className="field-grid two">
      <label>
        Game name
        <input
          className="text-input"
          onChange={(event) => onGameNameChange(event.target.value)}
          placeholder="Optional"
          value={gameName}
        />
      </label>
      <label>
        Theme
        <select
          className="select-input"
          onChange={(event) => onThemeChange(event.target.value)}
          value={themeId}
        >
          {availableThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
