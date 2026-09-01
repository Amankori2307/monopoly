import type { SellableBuilding } from '../../../domain/rules/buildings.utils';
import type { IncomingMortgagedSite, TradeSideSummary } from '../trade/trade.interfaces';
import type {
  ColorGroupProgress,
  MortgageableSite,
} from '../../../domain/rules/holdings.utils';
import type {
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

export interface AuctionDecisionViewModel {
  type: PendingDecisionType.AuctionBid;
  spaceName: string;
  activeBidderName: string;
  highestBid: number;
  minimumBid: number;
  auction: AuctionState;
}

export interface JailDecisionViewModel {
  type: PendingDecisionType.JailChoice;
  playerName: string;
  canUseJailCard: boolean;
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
  | GameOverDecisionViewModel;

export interface DecisionHandlers {
  onBuy: () => void;
  onDecline: () => void;
  onBid: () => void;
  onBidAmountChange: (amount: number) => void;
  onPass: () => void;
  onPayJailFine: () => void;
  onUseJailCard: () => void;
  onAcknowledgeCard: () => void;
  onMortgageSite: (spaceId: SpaceId) => void;
  onSellBuilding: (spaceId: SpaceId, isHotel: boolean) => void;
  onSettleDebt: () => void;
  onDeclareBankruptcy: () => void;
  onAcceptTrade: (choices: Record<SpaceId, MortgageChoice>) => void;
  onRejectTrade: () => void;
  onChooseBusMove: (steps: number) => void;
  onChooseDestination: (spaceId: SpaceId) => void;
}
