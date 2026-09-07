import { MAX_PLAYERS } from '../../domain/constants/game.constants';
import type { ThemeToken } from '../../domain/types/game.interfaces';
import type { LobbySeatView } from './lobby.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface LobbySeatsProps {
  seats: LobbySeatView[];
  /** This device's seat, marked so a player can find themselves. */
  mySeatId: string | null;
  findToken: (tokenId: string) => ThemeToken | undefined;
}

/**
 * Who is at the table, and how many chairs are still empty.
 *
 * The empty chairs are drawn rather than counted: somebody waiting for friends
 * needs to see whether there is room, and "2 of 8" alone reads like a warning.
 */
export function LobbySeats({ seats, mySeatId, findToken }: LobbySeatsProps) {
  const empty = Math.max(0, MAX_PLAYERS - seats.length);

  return (
    <ul className="lobby-seats" data-testid={TEST_IDS.lobbySeats}>
      {seats.map((seat) => (
        <li
          className={`lobby-seat ${seat.seatId === mySeatId ? 'is-mine' : ''}`}
          data-testid={TEST_IDS.lobbySeat}
          key={seat.seatId}
        >
          <span aria-hidden="true" className="lobby-seat-token">
            {findToken(seat.tokenId)?.emoji ?? '•'}
          </span>
          <span className="lobby-seat-name">{seat.name}</span>
          {seat.seatId === mySeatId ? <span className="lobby-seat-you">you</span> : null}
        </li>
      ))}
      {Array.from({ length: empty }, (_unused, index) => (
        <li className="lobby-seat is-empty" key={`empty-${index}`}>
          <span aria-hidden="true" className="lobby-seat-token">
            ·
          </span>
          <span className="lobby-seat-name">Empty</span>
        </li>
      ))}
    </ul>
  );
}
