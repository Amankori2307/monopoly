import {
  JAIL_FINE,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesStart() {
  return (
    <section id="start">
      <p className="eyebrow">1. Set it up</p>
      <h2>Before the first roll</h2>
      <ol>
        <li>
          Choose a Banker. The Banker controls the bank&apos;s money, title deeds, houses,
          hotels, and auctions.
        </li>
        <li>
          Give each player {formatMoney(STARTING_CASH)}. Keep the remaining money in the
          Bank.
        </li>
        <li>
          Shuffle Chance and Community Chest separately and place both decks face down.
        </li>
        <li>Each player chooses a token and places it on GO.</li>
        <li>
          Each player rolls both dice. The highest roll goes first; play moves to the
          left.
        </li>
      </ol>
      <div className="rules-facts">
        <span>
          Players<strong>2–8</strong>
        </span>
        <span>
          Starting cash<strong>{formatMoney(STARTING_CASH)}</strong>
        </span>
        <span>
          GO salary<strong>{formatMoney(PASS_GO_AMOUNT)}</strong>
        </span>
        <span>
          Jail fine<strong>{formatMoney(JAIL_FINE)}</strong>
        </span>
      </div>
    </section>
  );
}
