import {
  AUCTION_START_PRICE,
  HOTELS_AVAILABLE,
  HOUSES_AVAILABLE,
} from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesBuildings() {
  return (
    <section id="buildings">
      <p className="eyebrow">6. Buildings</p>
      <h2>Build evenly, then upgrade</h2>
      <ul>
        <li>
          Complete a color set before buying houses. Rent on unimproved properties in a
          completed set increases.
        </li>
        <li>
          Pay the listed house cost to the Bank and build evenly across the whole set.
        </li>
        <li>You may build up to four houses on each city.</li>
        <li>
          When every city in a complete set has four houses, upgrade a city to one hotel
          by paying its hotel cost and returning the four houses to the Bank.
        </li>
        <li>You cannot build in a color set while any city in that set is mortgaged.</li>
        <li>
          There are {HOUSES_AVAILABLE} houses and {HOTELS_AVAILABLE} hotels. If supply is
          contested, the Banker auctions the last available building from{' '}
          {formatMoney(AUCTION_START_PRICE)}.
        </li>
      </ul>
    </section>
  );
}
