import type { TradableSite } from '../../../domain/rules/trade.utils';
import type { PlayerId, SpaceId } from '../../../domain/types/game.interfaces';

/** One player as the offer builder sees them: what they hold and could give. */
export interface TradePartyViewModel {
  playerId: PlayerId;
  name: string;
  /** The token colour, so each column is recognisably that player's side. */
  color: string;
  cash: number;
  jailCards: number;
  sites: TradableSite[];
}

/** Both sides of a trade being assembled. */
export interface TradeBuilderViewModel {
  proposer: TradePartyViewModel;
  recipient: TradePartyViewModel;
}

/** One side of an agreed trade, in words, for the recipient to read. */
export interface TradeSideSummary {
  playerName: string;
  cash: number;
  siteNames: string[];
  jailCards: number;
  /** Mortgage interest this side owes the bank on what it receives. */
  transferFee: number;
}

/** A mortgaged site coming to the recipient, and what each option costs. */
export interface IncomingMortgagedSite {
  spaceId: SpaceId;
  name: string;
  /** Interest only: the site stays mortgaged. */
  keepCost: number;
  /** Mortgage value plus interest: the site comes free. */
  redeemCost: number;
}
