import { SPEED_DIE_BONUS_CASH } from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesSpeedDie() {
  return (
    <section id="speed-die">
      <p className="eyebrow">8. Speed Die</p>
      <h2>Optional faster-play rules</h2>
      <p>
        The India Edition box includes a Speed Die. It is optional and is not used until
        every player has passed GO for the first time. At the start of a Speed Die game,
        each player receives an extra {formatMoney(SPEED_DIE_BONUS_CASH)}.
      </p>
      <ul>
        <li>Roll the Speed Die with the two white dice on your turn.</li>
        <li>Its six faces are 1, 2, 3, Bus, Bus, and Mr. Monopoly.</li>
        <li>On 1, 2, or 3, add that number to the two white dice total.</li>
        <li>On a Bus, choose the value of one white die or both white dice.</li>
        <li>
          On Mr. Monopoly, move by the white dice as usual, resolve that space, then
          advance to the next unowned asset to buy or auction. If none are unowned,
          advance to the next player-owned asset and pay rent.
        </li>
        <li>
          Only white dice count for doubles and for rolling out of Jail. If all three dice
          match, move to any space on the board.
        </li>
      </ul>
      <p className="source-note">
        Turn it on when you create a game. It cannot be switched on mid-game, which is
        also what keeps the starting bonus fair.
      </p>
    </section>
  );
}
