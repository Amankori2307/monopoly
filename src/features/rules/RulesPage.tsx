import { Link } from 'react-router-dom';

const sectionLinks = [
  ['Start', '#start'],
  ['Turn', '#turn'],
  ['Board', '#board'],
  ['Jail', '#jail'],
  ['Buildings', '#buildings'],
  ['Money', '#money'],
  ['Speed Die', '#speed-die'],
];

export function RulesPage() {
  return (
    <div className="app-shell rules-shell">
      <main className="rules-page">
        <header className="rules-header">
          <div>
            <p className="eyebrow">Monopoly India Edition</p>
            <h1>Rules of play</h1>
            <p className="rules-lede">
              A digital reading guide based on the India Edition booklet and board.
            </p>
          </div>
          <Link className="secondary-button" to="/">
            Back to games
          </Link>
        </header>

        <nav className="rules-nav" aria-label="Rules sections">
          {sectionLinks.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>

        <article className="rules-booklet">
          <section className="rules-intro">
            <p className="eyebrow">A short history</p>
            <h2>From property trading to the India Edition</h2>
            <p>
              According to Hasbro&apos;s published history, Charles B. Darrow presented
              MONOPOLY to Parker Brothers in 1934; Parker Brothers began selling the
              property-trading game in 1935. This edition keeps the familiar game
              structure but uses Indian cities, railway stations, rupee-style money,
              and India Edition values.
            </p>
            <p className="source-note">
              History source:{' '}
              <a href="https://www.hasbro.com/common/instruct/monins.pdf">
                Hasbro&apos;s official Monopoly rules and history
              </a>
              . India Edition gameplay details below come from the booklet and board
              supplied for this project.
            </p>
          </section>

          <section id="start">
            <p className="eyebrow">1. Set it up</p>
            <h2>Before the first roll</h2>
            <ol>
              <li>Choose a Banker. The Banker controls the bank&apos;s money, title deeds, houses, hotels, and auctions.</li>
              <li>Give each player M1500. Keep the remaining money in the Bank.</li>
              <li>Shuffle Chance and Community Chest separately and place both decks face down.</li>
              <li>Each player chooses a token and places it on GO.</li>
              <li>Each player rolls both dice. The highest roll goes first; play moves to the left.</li>
            </ol>
            <div className="rules-facts">
              <span>Players<strong>2–8</strong></span>
              <span>Starting cash<strong>M1500</strong></span>
              <span>GO salary<strong>M200</strong></span>
              <span>Jail fine<strong>M50</strong></span>
            </div>
          </section>

          <section id="turn">
            <p className="eyebrow">2. Take your turn</p>
            <h2>Roll, move, resolve</h2>
            <ol>
              <li>Roll both white dice and move forward by their total.</li>
              <li>Resolve the space where you land.</li>
              <li>Rolling doubles gives you another roll. Three doubles in a row sends you directly to Jail and ends your turn.</li>
              <li>When your turn ends, the player on your left goes next.</li>
            </ol>
            <p className="callout">
              Passing or landing on GO pays M200. Going directly to Jail does not pay
              the GO salary.
            </p>
          </section>

          <section id="board">
            <p className="eyebrow">3. Board spaces</p>
            <h2>What happens when you land</h2>
            <div className="rules-table-wrap">
              <table>
                <thead><tr><th>Space</th><th>Rule</th></tr></thead>
                <tbody>
                  <tr><td>Unowned city, railway, or utility</td><td>Buy it for the price shown, or decline it. A declined asset must be auctioned.</td></tr>
                  <tr><td>Owned city</td><td>Pay the rent on its Title Deed card. A completed color set earns increased rent, and buildings increase it further.</td></tr>
                  <tr><td>Railway</td><td>Rent rises as its owner gains more railways: M25, M50, M100, then M200.</td></tr>
                  <tr><td>Utility</td><td>Roll again for rent: 4× the dice roll if the owner has one utility, or 10× if they own both.</td></tr>
                  <tr><td>Chance / Community Chest</td><td>Draw the top card, follow it immediately, then return it to the bottom unless it is a Get Out of Jail Free card.</td></tr>
                  <tr><td>Income Tax / Super Tax</td><td>Pay the Bank M200 / M100 respectively.</td></tr>
                  <tr><td>Free Parking</td><td>Nothing happens. There is no Free Parking jackpot.</td></tr>
                  <tr><td>Just Visiting</td><td>Nothing happens; place your token in the Just Visiting area.</td></tr>
                  <tr><td>Go To Jail</td><td>Move directly to Jail. Do not collect M200.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <p className="eyebrow">4. Buy and auction</p>
            <h2>Every unowned asset gets a chance to sell</h2>
            <p>When you land on an unowned city, railway, or utility, buy it at the listed price and take the title deed. If you do not buy it, the Banker must auction it to all players.</p>
            <ul>
              <li>Auctions start at M10.</li>
              <li>Any player, including the player who landed there and the Banker if playing, may bid.</li>
              <li>Each bid can increase by as little as M1.</li>
              <li>The highest bidder pays the Bank and takes the title deed. If nobody bids, the asset remains with the Bank.</li>
            </ul>
          </section>

          <section id="jail">
            <p className="eyebrow">5. Jail</p>
            <h2>Three ways out</h2>
            <p>At the start of your next turn, choose one of these options:</p>
            <ol>
              <li>Pay M50, then roll and move normally.</li>
              <li>Use or buy a Get Out of Jail Free card, return it to the bottom of its deck, then roll and move.</li>
              <li>Try to roll doubles. If you do, move by that roll and your turn ends.</li>
            </ol>
            <p>You have up to three turns to roll doubles. If you fail on your third turn, pay M50 and use that final roll to move. While in Jail, you can still collect rent, auction, build, mortgage, and trade.</p>
          </section>

          <section id="buildings">
            <p className="eyebrow">6. Buildings</p>
            <h2>Build evenly, then upgrade</h2>
            <ul>
              <li>Complete a color set before buying houses. Rent on unimproved properties in a completed set increases.</li>
              <li>Pay the listed house cost to the Bank and build evenly across the whole set.</li>
              <li>You may build up to four houses on each city.</li>
              <li>When every city in a complete set has four houses, upgrade a city to one hotel by paying its hotel cost and returning the four houses to the Bank.</li>
              <li>You cannot build in a color set while any city in that set is mortgaged.</li>
              <li>There are 32 houses and 12 hotels. If supply is contested, the Banker auctions the last available building from M10.</li>
            </ul>
          </section>

          <section id="money">
            <p className="eyebrow">7. Mortgages, trades, and bankruptcy</p>
            <h2>Raise cash honestly</h2>
            <h3>Mortgages and sales</h3>
            <ul>
              <li>Sell houses and hotels back to the Bank for half their cost. Houses must be sold evenly across a color set.</li>
              <li>Before mortgaging a city, sell all buildings in its color set.</li>
              <li>To mortgage, turn the title deed face down and take its mortgage value from the Bank. Mortgaged assets collect no rent.</li>
              <li>To unmortgage, pay the mortgage value plus 10%.</li>
            </ul>
            <h3>Deals and trades</h3>
            <p>Players may buy, sell, or swap property at any time. Trades may include cash, property, and Get Out of Jail Free cards. Buildings cannot be traded and must first be sold to the Bank. No loans, future promises, or private rent agreements are part of the game.</p>
            <h3>If you cannot pay</h3>
            <p>First try selling buildings and mortgaging property. If you still cannot pay, you are bankrupt and leave the game. Debt to another player transfers your mortgaged properties and jail-free cards to that player; they must immediately repay the mortgage or pay 10% to keep it mortgaged. Debt to the Bank returns your properties to the Bank, cancels mortgages, and auctions those properties. Play continues until one player remains.</p>
          </section>

          <section id="speed-die">
            <p className="eyebrow">8. Speed Die</p>
            <h2>Optional faster-play rules</h2>
            <p>The India Edition box includes a Speed Die. It is optional and is not used until every player has passed GO for the first time. At the start of a Speed Die game, each player receives an extra M1000.</p>
            <ul>
              <li>Roll the Speed Die with the two white dice on your turn.</li>
              <li>On 1, 2, or 3, add that number to the two white dice total.</li>
              <li>On a Bus, choose the value of one white die or both white dice.</li>
              <li>On Mr. Monopoly, move by the white dice as usual, resolve that space, then advance to the next unowned asset to buy or auction. If none are unowned, advance to the next player-owned asset and pay rent.</li>
              <li>Only white dice count for doubles and for rolling out of Jail. If all three dice match, move to any space on the board.</li>
            </ul>
            <p className="source-note">In this app, the Speed Die rules are documented here but gameplay support is planned for a later release.</p>
          </section>

          <section className="rules-closing">
            <h2>How to win</h2>
            <p>Buy, collect rent, build, trade, and manage your cash until every other player is bankrupt. The last player left in the game wins.</p>
          </section>
        </article>
      </main>
    </div>
  );
}
