import { playerColorForIndex } from '../../domain/themes/playerColors.constants';

interface PlayerConfigRowProps {
  index: number;
  name: string;
  onNameChange: (index: number, value: string) => void;
}

/**
 * One player at setup: a name, and the colour they will be.
 *
 * The colour is SHOWN, not chosen. This row used to carry a `Token` select of
 * eight playing pieces beside the name, and the piece was never drawn - every
 * player is a plain coloured disc on the board, so an elephant and a top hat
 * were the same circle in two colours. The engine assigns the colour by
 * creation order now, so the swatch here is a promise rather than a control:
 * it is exactly the colour this player will wear.
 */
export function PlayerConfigRow({ index, name, onNameChange }: PlayerConfigRowProps) {
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
    </div>
  );
}
