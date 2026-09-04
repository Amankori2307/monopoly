import { availableThemes } from '../../domain/themes/indiaEditionTheme';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/constants/game.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface GameIdentityFieldsProps {
  gameName: string;
  onGameNameChange: (value: string) => void;
  onPlayerCountChange: (value: number) => void;
  onThemeChange: (value: string) => void;
  playerCount: number;
  /** Says when a typed count was clamped, rather than silently correcting it. */
  playerCountNotice: string | null;
  themeId: string;
}

/**
 * What the game is called, how many are playing, and which ruleset it uses.
 *
 * The three sit in one row. The player count used to be on a row of its own
 * beside the ruleset summary, which left it stretched to half the form's width -
 * a number input the size of a name field. The summary is in the masthead now.
 */
export function GameIdentityFields({
  gameName,
  onGameNameChange,
  onPlayerCountChange,
  onThemeChange,
  playerCount,
  playerCountNotice,
  themeId,
}: GameIdentityFieldsProps) {
  return (
    <div className="field-grid setup-identity">
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
        Players
        <input
          className="text-input"
          data-testid={TEST_IDS.playerCountInput}
          max={MAX_PLAYERS}
          min={MIN_PLAYERS}
          onChange={(event) => onPlayerCountChange(Number(event.target.value))}
          type="number"
          value={playerCount}
        />
      </label>

      <label>
        Ruleset
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

      {playerCountNotice ? (
        <span
          className="helper-text setup-identity-notice"
          data-testid={TEST_IDS.playerCountNotice}
          role="status"
        >
          {playerCountNotice}
        </span>
      ) : null}
    </div>
  );
}
