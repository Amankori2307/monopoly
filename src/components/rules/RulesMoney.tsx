import { MORTGAGE_INTEREST_PERCENT } from '../../domain/constants/game.constants';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesMoney() {
  return (
    <section id="money">
      <p className="eyebrow">7. Mortgages, trades, and bankruptcy</p>
      <h2>Raise cash honestly</h2>
      <h3>Mortgages and sales</h3>
      <ul>
        <li>
          Sell houses and hotels back to the Bank for half their cost. Houses must be sold
          evenly across a color set.
        </li>
        <li>Before mortgaging a city, sell all buildings in its color set.</li>
        <li>
          To mortgage, turn the title deed face down and take its mortgage value from the
          Bank. Mortgaged assets collect no rent.
        </li>
        <li>To unmortgage, pay the mortgage value plus {MORTGAGE_INTEREST_PERCENT}%.</li>
      </ul>
      <h3>Deals and trades</h3>
      <p>
        Offer a deal from any site another player owns. Trades may include cash, property,
        and Get Out of Jail Free cards, in any combination and at any price you both
        agree. Buildings cannot be traded and must first be sold to the Bank, and neither
        can a site whose color set still holds any. A mortgaged site can be traded, and
        the player receiving it chooses: pay the Bank {MORTGAGE_INTEREST_PERCENT}% and
        keep it mortgaged, or clear the mortgage outright for its value plus the same{' '}
        {MORTGAGE_INTEREST_PERCENT}%. No loans, future promises, or private rent
        agreements are part of the game.
      </p>
      <h3>If you cannot pay</h3>
      <p>
        First try selling buildings and mortgaging property. If you still cannot pay, you
        are bankrupt and leave the game. Debt to another player transfers everything you
        hold to them, mortgages and all. Debt to the Bank returns your properties unowned,
        to be bought again by whoever lands on them. Play continues until one player
        remains, and that player wins.
      </p>
    </section>
  );
}
