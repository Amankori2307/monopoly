import {
  JAIL_FINE,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';
import { useRulesEdition } from './RulesEditionContext';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesStart() {
  const { currencySymbol } = useRulesEdition();
  const money = (amount: number) => formatMoney(amount, currencySymbol);

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
          Give each player {money(STARTING_CASH)}. Keep the remaining money in the Bank.
        </li>
        <li>
          Shuffle Chance and Community Chest separately and place both decks face down.
        </li>
        <li>Each player chooses a token and places it on GO.</li>
        <li>
          Each player rolls both dice. The highest roll goes first; play moves to the
          left. If two players tie for the highest, only those players roll again.
        </li>
      </ol>
      <div className="rules-facts">
        <span>
          Players<strong>2–8</strong>
        </span>
        <span>
          Starting cash<strong>{money(STARTING_CASH)}</strong>
        </span>
        <span>
          GO salary<strong>{money(PASS_GO_AMOUNT)}</strong>
        </span>
        <span>
          Jail fine<strong>{money(JAIL_FINE)}</strong>
        </span>
      </div>
    </section>
  );
}
