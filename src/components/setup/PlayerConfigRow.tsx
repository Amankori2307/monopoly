import { playerColorForIndex } from '../../domain/themes/playerColors.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface PlayerConfigRowProps {
  index: number;
  isBot: boolean;
  name: string;
  onIsBotChange: (index: number, value: boolean) => void;
  onNameChange: (index: number, value: string) => void;
}

/**
 * One player at setup: a name, the colour they will be, and whether anybody is
 * sitting behind them.
 *
 * The colour is SHOWN, not chosen. This row used to carry a `Token` select of
 * eight playing pieces beside the name, and the piece was never drawn - every
 * player is a plain coloured disc on the board, so an elephant and a top hat
 * were the same circle in two colours. The engine assigns the colour by
 * creation order now, so the swatch here is a promise rather than a control:
 * it is exactly the colour this player will wear.
 *
 * The bot switch is a `<label>` around the box rather than a box with a label
 * beside it, because `$control-checkbox` stays 20px on purpose and the LABEL is
 * what has to clear the 44px tap floor - the same arrangement `.checkbox-field`
 * already has, and what `mobile.spec.ts` measures.
 */
export function PlayerConfigRow({
  index,
  isBot,
  name,
  onIsBotChange,
  onNameChange,
}: PlayerConfigRowProps) {
  return (
    <div className="player-config-row">
      <label>
        Player {index + 1} name
        <span className="player-config-name">
          <span
            aria-hidden="true"
            className="player-dot"
            style={{ backgroundColor: playerColorForIndex(index).color }}
          />
          <input
            className="text-input"
            onChange={(event) => onNameChange(index, event.target.value)}
            value={name}
          />
        </span>
      </label>
      <label className="checkbox-field is-inline">
        <input
          checked={isBot}
          data-testid={`${TEST_IDS.playerBotToggle}-${index}`}
          onChange={(event) => onIsBotChange(index, event.target.checked)}
          type="checkbox"
        />
        {/* Second person for the player and a name for anybody else, per
            docs/conventions.md 3d - and the object rather than the bare verb,
            because eight of these sit in a column and "Bot" alone reads as a
            label for the row rather than as a thing to switch on. */}
        <span>Let the computer play this one</span>
      </label>
    </div>
  );
}
