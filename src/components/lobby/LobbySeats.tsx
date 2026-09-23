import { TEST_IDS } from '../../shared/constants/testIds.constants';
import type { LobbySeatView } from './lobby.interfaces';

interface LobbySeatsProps {
  seats: LobbySeatView[];
  /** This device's seat, marked so a player can find themselves. */
  mySeatId: string | null;
  /** Whose table it is. They are the only one who can start it. */
  hostSeatId: string | null;
}

/**
 * Who is at the table.
 *
 * It used to draw `MAX_PLAYERS - seats.length` rows of the word "Empty", so two
 * players at a table looked like six things missing - most of a 360px phone
 * screen spent on furniture. Whether there is room is one sentence, and it only
 * has to be said while there IS room.
 *
 * Each seat wears its colour, which is the whole of a player's identity: the
 * board piece is a plain coloured disc and there is nothing else to show. It
 * was the token's emoji, for pieces that were never drawn.
 */
export function LobbySeats({ seats, mySeatId, hostSeatId }: LobbySeatsProps) {
  return (
    <ul className="lobby-seats" data-testid={TEST_IDS.lobbySeats}>
      {seats.map((seat) => (
        <li
          className={`lobby-seat ${seat.seatId === mySeatId ? 'is-mine' : ''}`}
          data-testid={TEST_IDS.lobbySeat}
          key={seat.seatId}
        >
          <span
            aria-hidden="true"
            className="player-dot"
            style={{ backgroundColor: seat.color }}
          />
          <span className="lobby-seat-name">{seat.name}</span>
          {seat.seatId === hostSeatId ? (
            <span className="lobby-seat-role">host</span>
          ) : null}
          {seat.seatId === mySeatId ? <span className="lobby-seat-you">you</span> : null}
        </li>
      ))}
    </ul>
  );
}
