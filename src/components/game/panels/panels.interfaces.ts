import type { SellableBuilding } from '../../../domain/rules/buildings.utils';
import type { IncomingMortgagedSite, TradeSideSummary } from '../trade/trade.interfaces';
import type {
  ColorGroupProgress,
  MortgageableSite,
} from '../../../domain/rules/holdings.utils';
import type {
  AuctionLedgerKind,
  BuildingKind,
  MortgageChoice,
  PendingDecisionType,
} from '../../../domain/types/game.enums';
import type {
  AuctionState,
  BoardSpace,
  OwnableSpace,
  OwnershipState,
  PlayerId,
  PlayerState,
  SpaceId,
  ThemeToken,
} from '../../../domain/types/game.interfaces';

/**
 * View models the game panels render.
 *
 * They live in the component layer on purpose: components may not import from
 * `features/`, so the feature layer builds these and passes them down. A
 * component's own Props interface stays beside the component; only shared,
 * exported shapes belong here.
 */

export interface PlayerSummary {
  player: PlayerState;
  token: ThemeToken | undefined;
  propertyCount: number;
  /** Cash plus site and building value - who is actually winning. */
  netWorth: number;
  mortgagedCount: number;
  /** Colour groups they hold any of, and how close each is to a full set. */
  setProgress: ColorGroupProgress[];
}

export interface HoldingEntry {
  space: BoardSpace;
  ownership: OwnershipState | undefined;
}

export interface BuyDecisionViewModel {
  type: PendingDecisionType.LandedUnownedProperty;
  playerName: string;
  /** The whole space, so the decision can show the same card as the board does. */
  space: OwnableSpace;
}

/**
 * A player named in the auction log: the one bidding now, or the one a past line
 * belongs to.
 *
 * There is deliberately no `isActive` or `hasPassed` here. Both existed for a
 * bidder roster that said what the log's own lines already say - "Asha passed",
 * "Vikram bidding..." - and the panel is a fixed height, so the roster's rows
 * came out of the log's.
 */
export interface AuctionBidderViewModel {
  playerId: PlayerId;
  name: string;
  token: ThemeToken | undefined;
  cash: number;
}

/**
 * One line of the auction's history, with its player already resolved.
 *
 * The engine's ledger stores ids; the panel needs the name and the colour, and
 * resolving that once here keeps the lookup out of the component.
 */
export interface AuctionLedgerLineViewModel {
  kind: AuctionLedgerKind;
  /** Null on the opening line, which is the bank's. */
  bidder: AuctionBidderViewModel | null;
  amount: number | null;
}

/**
 * The bid field as the panel shows it: what to put in the input, the bounds, and
 * why Submit is disabled. Derived in the feature layer from the live auction and
 * whatever the bidder has typed.
 */
export interface BidFieldState {
  /** What to show: what was typed, or the minimum legal bid when untouched. */
  amount: number;
  minimumBid: number;
  /** Everything the bidder holds - the most they could possibly offer. */
  maximumBid: number;
  /** Why this amount cannot be submitted, or null when it can. */
  blockedReason: string | null;
}

export interface AuctionDecisionViewModel {
  type: PendingDecisionType.AuctionBid;
  /** The deed on show. On a building auction, the site that set the price. */
  space: BoardSpace;
  spaceName: string;
  /** Set when a house or hotel is what is for sale, not the site. */
  buildingKind: BuildingKind | undefined;
  activeBidderName: string;
  /** Whose turn it is to bid - the log's last line names them. */
  activeBidder: AuctionBidderViewModel;
  highestBid: number;
  minimumBid: number;
  /** The whole history: opened at, bid, passed, oldest first. */
  ledger: AuctionLedgerLineViewModel[];
  auction: AuctionState;
}

export interface JailDecisionViewModel {
  type: PendingDecisionType.JailChoice;
  playerName: string;
  canUseJailCard: boolean;
  /**
   * Failed attempts at doubles so far, so the panel can say which of the three
   * the player is about to take. The third failure is where the fine is forced.
   */
  attemptsUsed: number;
  /** The engine's last throw, so the panel's dice settle on it. */
  lastRoll: number[] | null;
}

export interface CardDrawDecisionViewModel {
  type: PendingDecisionType.CardDraw;
  playerName: string;
  deckLabel: string;
  cardTitle: string;
  cardDescription: string;
}

export interface LiquidationDecisionViewModel {
  type: PendingDecisionType.AssetLiquidation;
  playerName: string;
  amountDue: number;
  playerId: PlayerId;
  /** Who is owed, or null when the debt is to the bank. */
  creditorName: string | null;
  /** What the debt is for, e.g. "rent on Delhi". */
  reason: string;
  /**
   * Sites the debtor can mortgage right now. The panel lists them itself: the
   * decision modal covers the board, so the site panel is out of reach.
   */
  mortgageableSites: MortgageableSite[];
  /**
   * Buildings the debtor can sell right now. Buildings block mortgaging their
   * whole colour set, so this is the first move available to a built-up player.
   */
  sellableBuildings: SellableBuilding[];
  /** True once the debtor's cash covers the debt. */
  canSettle: boolean;
  /**
   * True when the debt exceeds everything the debtor has and could raise. This
   * is what makes them bankrupt rather than merely short.
   */
  isBankrupt: boolean;
  /** Debts from the same card still waiting behind this one. */
  queuedDebtCount: number;
}

export interface TradeResponseDecisionViewModel {
  type: PendingDecisionType.TradeResponse;
  recipientName: string;
  /**
   * Mortgaged sites coming to the recipient. The printed rule lets them either
   * clear the mortgage now or pay the 10% and keep it, so the panel asks.
   */
  incomingMortgaged: IncomingMortgagedSite[];
  /** What the recipient receives, and what they hand over. */
  incoming: TradeSideSummary;
  outgoing: TradeSideSummary;
}

export interface SpeedDieBusDecisionViewModel {
  type: PendingDecisionType.SpeedDieBus;
  playerName: string;
  whiteDice: [number, number];
}

export interface SpeedDieDestinationDecisionViewModel {
  type: PendingDecisionType.SpeedDieDestination;
  playerName: string;
  /** The whole board, because any space on it is a legal answer. */
  board: BoardSpace[];
}

export interface BuildingPlacementDecisionViewModel {
  type: PendingDecisionType.BuildingPlacement;
  playerName: string;
  buildingKind: BuildingKind;
  paidAmount: number;
  /** The sites this player may legally put it on. */
  sites: SellableBuilding[];
}

export interface GameOverDecisionViewModel {
  type: PendingDecisionType.GameOver;
  winnerName: string;
}

export type DecisionViewModel =
  | BuyDecisionViewModel
  | AuctionDecisionViewModel
  | JailDecisionViewModel
  | CardDrawDecisionViewModel
  | LiquidationDecisionViewModel
  | TradeResponseDecisionViewModel
  | SpeedDieBusDecisionViewModel
  | SpeedDieDestinationDecisionViewModel
  | BuildingPlacementDecisionViewModel
  | GameOverDecisionViewModel;

export interface DecisionHandlers {
  onBuy: () => void;
  onDecline: () => void;
  onBid: () => void;
  onBidAmountChange: (amount: number) => void;
  onPass: () => void;
  onPayJailFine: () => void;
  onUseJailCard: () => void;
  onAttemptJailRoll: () => void;
  onAcknowledgeCard: () => void;
  onMortgageSite: (spaceId: SpaceId) => void;
  onSellBuilding: (spaceId: SpaceId, isHotel: boolean) => void;
  onSettleDebt: () => void;
  onDeclareBankruptcy: () => void;
  onAcceptTrade: (choices: Record<SpaceId, MortgageChoice>) => void;
  onRejectTrade: () => void;
  onChooseBuildingSite: (spaceId: SpaceId) => void;
  onChooseBusMove: (steps: number) => void;
  onChooseDestination: (spaceId: SpaceId) => void;
}
