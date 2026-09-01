import type { RuleCoverageMap } from './ruleCoverage.interfaces';

/**
 * Which test proves which rule, for the rules about owning things.
 *
 * Sections 8 to 16 of docs/india-edition-rules.md: building, mortgages,
 * trading, insolvency, the Speed Die, the board, the cards, the bank and turn
 * order. See ruleCoverage.turns.constants.ts for the other half.
 */
export const ASSET_RULE_COVERAGE: RuleCoverageMap = {
  '10.1': [
    'allows a site-for-cash swap both sides can cover',
    'refuses a trade that moves nothing',
  ],
  '10.2': ['refuses a site whose colour set holds buildings'],
  '10.3': [
    'lets the receiver clear a mortgage as part of the trade',
    'never clears a mortgage on the proposer side',
  ],
  '10.4': ['offers no way to auction a property you own'],
  '10.5': ['never buys a property back, at any price'],
  '11.1': [
    'offers building sales inside the liquidation panel',
    'leaves a pending liquidation standing',
  ],
  '11.2': [
    'lets the debtor mortgage a site and settle, paying the creditor',
    'a player who cannot pay can mortgage their way out',
  ],
  '11.3': ['moves sites and cash both ways on acceptance'],
  '11.4': [
    'hands everything to the creditor',
    'keeps a mortgaged site mortgaged when it changes hands',
  ],
  '11.5': [
    'returns sites to the bank, unmortgaged, when the debt was the bank’s',
    'opens an auction for the first site and queues the rest',
    "auctions a bankrupt player's sites, one after another",
  ],
  '12.1': [
    'is off unless the game asked for it',
    'is never active in a game that did not ask for it',
    'shows no third die in an ordinary game',
  ],
  '12.2': [
    'waits until every player has passed GO',
    'rolls no third die before everyone has passed GO',
    'starts nobody as having passed GO',
    'records the trip past GO, not just the salary',
  ],
  '12.3': ['starts every player with the bonus when it is on'],
  '12.4': [
    'rolls a third die once it is live',
    'shows the third die beside the white dice',
  ],
  '12.5': [
    'adds a numeric face to the move without touching the doubles count',
    'adds its steps to the move',
    'leaves a double a double, and adds its steps too',
  ],
  '12.6': [
    'asks which dice to move by on a Bus',
    'moves by one white die, the other, or both',
    'offers exactly the three bus moves',
    'refuses any other number of steps',
    'keeps the extra roll a double earned, once the move is chosen',
    'ends the turn when the white dice were not a double',
  ],
  '12.7': [
    'falls through to an opponent asset when nothing is unowned',
    'runs once the decision the landing raised has been answered',
    'stops owing an advance once it has been taken',
    'walks past a mortgaged site to one that actually charges rent',
    'finds nowhere to go when every opponent site is mortgaged',
  ],
  '12.8': [
    'cannot create a double by matching one of the white dice',
    'cannot create a double by matching the total a real double would give',
    'is false when the white dice match but the Speed Die does not',
  ],
  '12.9': [
    'frees a player who rolls doubles, and ends their turn',
    'is left out of a Jail attempt',
  ],
  '12.10': [
    'leaves a double a double, and adds its steps too',
    'cannot break a double by making the total odd',
  ],
  '12.11': [
    'asks where to go when all three dice match',
    'asks the player to move anywhere, and grants no extra roll',
    'leaves no extra roll once the destination is chosen',
    'grants no extra roll even when a double came first',
    'does not send a player to Jail as the would-be third double',
    'is possible on %i, the faces the die carries',
    'is impossible on %i, which no face shows',
  ],
  '12.12': [
    'still sends the player to Jail when the third is not a triple',
    'does not send a player to Jail as the would-be third double',
  ],
  '12.13': [
    'runs once the decision the landing raised has been answered',
    'keeps the extra roll when the white dice were a double',
  ],
  '13.1': ['has forty spaces'],
  '13.2': ['has twenty-eight ownable assets: 22 streets, 4 railways, 2 utilities'],
  '13.3': ['has eight colour groups of the documented sizes'],
  '13.4': ['puts the three Chance spaces at 7, 22 and 36'],
  '13.5': ['puts the three Community Chest spaces at 2, 17 and 33'],
  '13.6': ['puts the four corners at 0, 10, 20 and 30'],
  '13.7': ['has eight Chance cards'],
  '13.8': ['has eight Community Chest cards'],
  '13.9': [
    'matches the space order the ruleset documents',
    'gives every space the index it sits at',
  ],
  '14.1': [
    'applies a Collect effect only once acknowledged',
    'logs the amount so the credit is visible, not silent',
  ],
  '14.2': ['applies a Pay effect, charging the bank'],
  '14.3': ['applies a MoveTo effect, advancing to the named index'],
  '14.4': [
    'pays no GO salary when a card moves the player backwards',
    'pays no GO salary for a backward move that wraps',
  ],
  '14.5': ['ends the turn when a card sends the player to jail on a doubles roll'],
  '14.6': [
    'returns a used card to the deck it came from',
    'keeps the other cards a player is holding',
  ],
  '14.7': [
    'pays the collector for every debt in the queue',
    'records the first debt and queues the second',
  ],
  '14.8': ['queues each payee the drawer cannot cover'],
  '14.9': ['draws the second card instead of settling the turn'],
  '14.10': [
    'pays no GO salary when a card moves the player backwards',
    'pays no GO salary for a backward move that wraps',
  ],
  '14.11': ['pays the GO salary when a card moves the player forwards past GO'],
  '14.12': ['does not grant an extra roll when a card sends the player to jail'],
  '14.13': ['offers an unowned property a card landed the player on'],
  '14.14': ['charges a fresh throw rather than the turn roll'],
  '14.15': ['returns a used card to the deck it came from'],
  '14.16': ['keeps the other cards a player is holding'],
  '15.1': ['never runs out of money'],
  '15.2': [
    'charges the house cost and takes a house from the bank',
    'returns the buildings to the bank',
  ],
  '15.3': ['logs a tax payment to the bank'],
  '15.4': ['never buys a property back, at any price'],
  '15.5': ['pays back half and returns the house to the bank on a sale'],
  '16.1': [
    'passes play along the order fixed at setup',
    'passes play to the left of the winner, rather than ranking by throw',
  ],
  '16.2': ['rejects a plain roll while the player is in jail'],
  '16.3': ['keeps the extra roll after buying'],
  '16.4': [
    'skips a bankrupt player when the turn passes',
    'never invites the bankrupt player to bid',
  ],
  '16.5': [
    'declares the last player standing the winner',
    'does not end the game while two players remain',
    'declares a winner when the last opponent goes bankrupt',
  ],
  '8.1': [
    'refuses a site whose colour set is incomplete',
    'refuses to build on a set the player does not fully own',
  ],
  '8.2': ['refuses a build while any site in the set is mortgaged'],
  '8.3': ['charges the house cost and takes a house from the bank'],
  '8.4': ['resolves each roll in turn and keeps their outcomes when the third jails'],
  '8.5': [
    'refuses building past a hotel',
    'allows a hotel once the whole set holds four houses',
  ],
  '8.6': ['refuses a hotel while another site is short of four houses'],
  '8.7': [
    'returns the four houses to the bank when a hotel goes up',
    'upgrades four houses into a hotel and returns the houses',
  ],
  '8.8': ['refuses building past a hotel'],
  '8.9': [
    'charges the house cost and takes a house from the bank',
    'refuses a build once the bank is out of houses',
    'refuses a hotel once the bank is out of hotels',
  ],
  '8.10': ['refuses outright when the bank has none left'],
  '8.11': [
    'sends the last house to auction',
    'opens the bidding at the printed cost of the house',
    'invites only the players who could actually build',
    'places the house where the winner chooses',
  ],
  '8.12': ['buys buildings back, but only from their owner'],
  '8.13': [
    'pays back half and returns the house to the bank on a sale',
    'refunds half the build cost, rounded down',
    'sells a house back to the bank for half',
  ],
  '8.14': [
    'refuses an uneven sale',
    'refuses a sale that would open a two-level gap',
    'allows selling down from an even set',
  ],
  '8.15': [
    'breaks a hotel back into four houses',
    'refuses breaking a hotel the bank cannot cover in houses',
  ],
  '9.1': ['pays the mortgage value and marks the site mortgaged'],
  '9.2': ['counts a mortgaged site at its mortgage value'],
  '9.3': [
    'refuses a site whose colour set still holds buildings',
    'refuses a build while any site in the set is mortgaged',
  ],
  '9.4': ['charges the mortgage value plus interest, rounded up'],
  '9.5': [
    'keeps a mortgaged site mortgaged when it changes hands',
    'charges the receiver interest on a mortgaged site',
  ],
  '9.6': ['never buys a property back, at any price'],
};
