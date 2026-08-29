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
        <li>To unmortgage, pay the mortgage value plus 10%.</li>
      </ul>
      <h3>Deals and trades</h3>
      <p>
        Players may buy, sell, or swap property at any time. Trades may include cash,
        property, and Get Out of Jail Free cards. Buildings cannot be traded and must
        first be sold to the Bank. No loans, future promises, or private rent agreements
        are part of the game.
      </p>
      <h3>If you cannot pay</h3>
      <p>
        First try selling buildings and mortgaging property. If you still cannot pay, you
        are bankrupt and leave the game. Debt to another player transfers your mortgaged
        properties and jail-free cards to that player; they must immediately repay the
        mortgage or pay 10% to keep it mortgaged. Debt to the Bank returns your properties
        to the Bank, cancels mortgages, and auctions those properties. Play continues
        until one player remains.
      </p>
    </section>
  );
}
