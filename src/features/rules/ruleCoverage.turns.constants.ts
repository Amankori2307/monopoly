import type { RuleCoverageMap } from './ruleCoverage.interfaces';

export type { RuleCoverageMap } from './ruleCoverage.interfaces';

/**
 * Which test proves which rule, for the rules about taking a turn.
 *
 * Sections Q, 2, 3, 5, 6 and 7 of docs/india-edition-rules.md: setup, the turn
 * sequence, doubles, Jail, and what landing on a space does. Split from the
 * asset rules only because one file of all 153 runs past the line limit -
 * `ruleCoverage.constants.ts` merges them and is what everything imports.
 */
export const TURN_RULE_COVERAGE: RuleCoverageMap = {
  '2.1': ['raises the rent a visitor pays'],
  '2.2': ['offers the property actions from the site panel'],
  '2.3': ['rejects a bid below the minimum'],
  '2.4': ['pays nothing at all for Free Parking'],
  '2.5': ['charges a flat Income Tax'],
  '3.1': [
    'says so when a number above the maximum is pulled back',
    'says so when a number below the minimum is pulled up',
  ],
  '3.2': [
    'creates a game with India Edition defaults',
    'gives each player the starting cash',
  ],
  '3.3': ['gives every player a token from the theme catalogue'],
  '3.4': ['starts every token on GO'],
  '3.5': ['shuffles both decks at creation'],
  '3.6': [
    'gives the first turn to the highest throw',
    're-rolls a tie for the lead, and does not just take the first entered',
    'still produces a starter when a tie never breaks',
  ],
  '3.7': [
    'starts every player with the bonus when it is on',
    'starts a Speed Die game with the bonus, and an ordinary one without',
  ],
  '5.1': [
    'grants an extra roll for the first double',
    'resolves each roll in turn and keeps their outcomes when the third jails',
  ],
  '5.2': [
    'grants another for the second',
    'resolves each roll in turn and keeps their outcomes when the third jails',
  ],
  '5.3': [
    'sends the third double to Jail without playing the roll',
    'resolves each roll in turn and keeps their outcomes when the third jails',
    'offers no fourth double, because the third jailed them',
  ],
  '5.4': ['never leaves a jailed player able to roll again'],
  '5.5': [
    'ends the turn when a card sends the player to jail on a doubles roll',
    'does not grant an extra roll when a card sends the player to jail',
  ],
  '5.6': ['keeps the extra roll after a card when the player rolled doubles'],
  '5.7': [
    'keeps the extra roll after buying',
    'keeps the extra roll after declining, once the auction settles',
    'ends the turn after a decision when the roll was not doubles',
  ],
  '5.8': ['frees a player who rolls doubles, and ends their turn'],
  '5.9': ['does not count a Jail double toward the three-doubles rule'],
  '5.10': [
    'grants an extra roll for doubles rolled after paying the fine',
    'grants an ordinary double after leaving Jail with a card',
  ],
  '5.11': ['leaves a bankrupt player no extra roll, even after doubles'],
  '6.1': ['sends a player who lands on Go To Jail there, with no GO salary'],
  '6.2': ['ends the turn when a card sends the player to jail on a doubles roll'],
  '6.3': ['resolves each roll in turn and keeps their outcomes when the third jails'],
  '6.4': ['sends a player who lands on Go To Jail there, with no GO salary'],
  '6.5': ['does nothing at all when a player lands on Just Visiting'],
  '6.6': ['lets a player who pays the fine roll and move normally', 'offers all three'],
  '6.7': [
    'returns a used card to the deck it came from',
    'returns a Community Chest card to the Community Chest deck',
  ],
  '6.8': [
    'frees a player who rolls doubles, and ends their turn',
    'rolls for doubles when asked, once the dice have settled',
    'offers a jailed player the choice to try for doubles',
  ],
  '6.9': [
    'gives three turns, charging nothing until the third fails',
    'charges nothing until the third turn in Jail',
    'reads attempt %i as number %i of three',
    'allows only one attempt per turn',
    'starts a jailed player on a decision, not a plain roll',
  ],
  '6.10': ['charges the fine on the third failed attempt and moves by that roll'],
  '6.11': ['grants no extra roll on the forced third-turn move, even on doubles'],
  '6.12': [
    'keeps a player in Jail when the roll is not doubles',
    'takes no money at all across two failed turns',
    'allows one attempt per turn, and hands the turn back on a failure',
    'offers nothing once the attempt has been spent',
  ],
  '7.1': ['opens a buy decision when landing on an unowned property'],
  '7.2': ['starts an auction when the landed property is declined'],
  '7.3': ['raises the rent a visitor pays'],
  '7.4': ['does nothing when a player lands on their own site'],
  '7.5': ['charges a flat Income Tax'],
  '7.6': ['charges Super Tax'],
  '7.7': [
    'holds the drawn card as a decision without applying it',
    'shows a drawn card and applies it only on OK',
  ],
  '7.8': ['logs the pass-GO salary with the theme currency, not a hardcoded symbol'],
  '7.9': ['pays nothing at all for Free Parking'],
  '7.10': ['does nothing at all when a player lands on Just Visiting'],
  '7.11': ['sends a player who lands on Go To Jail there, with no GO salary'],
  '7a.1': ['starts an auction when the landed property is declined'],
  '7a.2': ['includes the player who declined among the bidders'],
  '7a.3': ['never returns the turn to a player who has passed'],
  '7a.4': ['rejects a bid below the minimum'],
  '7a.5': ['rejects a bid below the minimum'],
  '7a.6': ['rejects a bid above the bidder’s cash'],
  '7a.7': ['never returns the turn to a player who has passed'],
  '7a.8': ['leaves the property unowned when every player passes'],
  '7a.9': ['gives a site to the player who bids for it'],
  '7a.10': ['keeps the extra roll after declining, once the auction settles'],
  '7r.1': ['raises the rent a visitor pays'],
  '7r.2': [
    'is true once every street in the group is owned',
    'is false while the set is incomplete',
  ],
  '7r.3': ['raises the rent a visitor pays'],
  '7r.4': ['charges railway rent for %i stations owned'],
  '7r.5': [
    'charges four times the dice for one utility',
    'charges ten times the dice for both utilities',
  ],
  '7r.6': ['charges nothing on a mortgaged property'],
  '7r.7': ['raises the rent a visitor pays'],
  'Q1.1': ['resolves each roll in turn and keeps their outcomes when the third jails'],
  'Q1.2': ['resolves each roll in turn and keeps their outcomes when the third jails'],
  'Q1.3': ['resolves each roll in turn and keeps their outcomes when the third jails'],
  'Q2.1': ['frees a player who rolls doubles, and ends their turn'],
  'Q2.2': ['keeps a player in Jail when the roll is not doubles'],
  'Q2.3': ['charges the fine on the third failed attempt and moves by that roll'],
  'Q3.1': ['never buys a property back, at any price'],
  'Q3.2': ['offers no way to auction a property you own'],
  'Q3.3': [
    'allows a site-for-cash swap both sides can cover',
    'moves sites and cash both ways on acceptance',
  ],
  'Q3.4': [
    'lets the receiver choose what to do about a mortgaged site',
    'charges the receiver interest on a mortgaged site',
  ],
  'Q3.5': ['refuses a site whose colour set holds buildings'],
};
