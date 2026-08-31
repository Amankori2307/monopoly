import { PASS_GO_AMOUNT } from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesTurn() {
  return (
    <section id="turn">
      <p className="eyebrow">2. Take your turn</p>
      <h2>Roll, move, resolve</h2>
      <ol>
        <li>Roll both white dice and move forward by their total.</li>
        <li>Resolve the space where you land.</li>
        <li>
          Rolling doubles gives you another roll. Three doubles in a row sends you
          directly to Jail and ends your turn.
        </li>
        <li>When your turn ends, the player on your left goes next.</li>
      </ol>
      <p className="callout">
        Passing or landing on GO pays {formatMoney(PASS_GO_AMOUNT)}. Going directly to
        Jail does not pay the GO salary.
      </p>
    </section>
  );
}
