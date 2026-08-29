import type { ThemeToken } from '../../domain/types/game.interfaces';

interface PlayerConfigRowProps {
  index: number;
  name: string;
  onNameChange: (index: number, value: string) => void;
  onTokenChange: (index: number, value: string) => void;
  tokenCatalog: ThemeToken[];
  tokenId: string;
}

export function PlayerConfigRow({
  index,
  name,
  onNameChange,
  onTokenChange,
  tokenCatalog,
  tokenId,
}: PlayerConfigRowProps) {
  return (
    <div className="player-config-row">
      <label>
        Player {index + 1} name
        <input
          className="text-input"
          onChange={(event) => onNameChange(index, event.target.value)}
          value={name}
        />
      </label>
      <label>
        Token
        <select
          className="select-input"
          onChange={(event) => onTokenChange(index, event.target.value)}
          value={tokenId}
        >
          {tokenCatalog.map((token) => (
            <option key={token.id} value={token.id}>
              {token.emoji} {token.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
