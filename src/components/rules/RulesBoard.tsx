import { RAILWAY_RENT_BY_COUNT } from '../../domain/constants/board.constants';
import { PASS_GO_AMOUNT } from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesBoard() {
  return (
    <section id="board">
      <p className="eyebrow">3. Board spaces</p>
      <h2>What happens when you land</h2>
      <div className="rules-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Space</th>
              <th>Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unowned city, railway, or utility</td>
              <td>
                Buy it for the price shown, or decline it. A declined asset must be
                auctioned.
              </td>
            </tr>
            <tr>
              <td>Owned city</td>
              <td>
                Pay the rent on its Title Deed card. A completed color set earns increased
                rent, and buildings increase it further.
              </td>
            </tr>
            <tr>
              <td>Railway</td>
              <td>
                Rent rises as its owner gains more railways:{' '}
                {RAILWAY_RENT_BY_COUNT.map((rent) => formatMoney(rent)).join(', ')}.
              </td>
            </tr>
            <tr>
              <td>Utility</td>
              <td>
                Roll again for rent: 4× the dice roll if the owner has one utility, or 10×
                if they own both.
              </td>
            </tr>
            <tr>
              <td>Chance / Community Chest</td>
              <td>
                Draw the top card, follow it immediately, then return it to the bottom
                unless it is a Get Out of Jail Free card.
              </td>
            </tr>
            <tr>
              <td>Income Tax / Super Tax</td>
              <td>
                Pay the Bank {formatMoney(200)} / {formatMoney(100)} respectively.
              </td>
            </tr>
            <tr>
              <td>Free Parking</td>
              <td>Nothing happens. There is no Free Parking jackpot.</td>
            </tr>
            <tr>
              <td>Just Visiting</td>
              <td>Nothing happens; place your token in the Just Visiting area.</td>
            </tr>
            <tr>
              <td>Go To Jail</td>
              <td>
                Move directly to Jail. Do not collect {formatMoney(PASS_GO_AMOUNT)}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
