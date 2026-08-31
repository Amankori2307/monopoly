import { JAIL_FINE } from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesJail() {
  return (
    <section id="jail">
      <p className="eyebrow">5. Jail</p>
      <h2>Three ways out</h2>
      <p>At the start of your next turn, choose one of these options:</p>
      <ol>
        <li>Pay {formatMoney(JAIL_FINE)}, then roll and move normally.</li>
        <li>
          Use or buy a Get Out of Jail Free card, return it to the bottom of its deck,
          then roll and move.
        </li>
        <li>Try to roll doubles. If you do, move by that roll and your turn ends.</li>
      </ol>
      <p>
        You have up to three turns to roll doubles. If you fail on your third turn, pay
        {formatMoney(JAIL_FINE)} and use that final roll to move. While in Jail, you can
        still collect rent, auction, build, mortgage, and trade.
      </p>
    </section>
  );
}
