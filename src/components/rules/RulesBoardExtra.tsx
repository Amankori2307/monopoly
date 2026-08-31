import {
  AUCTION_MIN_INCREMENT,
  AUCTION_START_PRICE,
} from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesBoardExtra() {
  return (
    <section>
      <p className="eyebrow">4. Buy and auction</p>
      <h2>Every unowned asset gets a chance to sell</h2>
      <p>
        When you land on an unowned city, railway, or utility, buy it at the listed price
        and take the title deed. If you do not buy it, the Banker must auction it to all
        players.
      </p>
      <ul>
        <li>Auctions start at {formatMoney(AUCTION_START_PRICE)}.</li>
        <li>
          Any player, including the player who landed there and the Banker if playing, may
          bid.
        </li>
        <li>
          Each bid can increase by as little as {formatMoney(AUCTION_MIN_INCREMENT)}.
        </li>
        <li>
          The highest bidder pays the Bank and takes the title deed. If nobody bids, the
          asset remains with the Bank.
        </li>
      </ul>
    </section>
  );
}
