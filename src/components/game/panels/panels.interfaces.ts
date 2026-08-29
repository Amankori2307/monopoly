import type { PendingDecisionType } from '../../../domain/types/game.enums';
import type {
  AuctionState,
  BoardSpace,
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
}

export interface HoldingEntry {
  space: BoardSpace;
  ownership: OwnershipState | undefined;
}

export interface BuyDecisionViewModel {
  type: PendingDecisionType.LandedUnownedProperty;
  playerName: string;
  spaceId: SpaceId;
  spaceName: string;
  price: number;
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

export interface LiquidationDecisionViewModel {
  type: PendingDecisionType.AssetLiquidation;
  playerName: string;
  amountDue: number;
  playerId: PlayerId;
}

export type DecisionViewModel =
  | BuyDecisionViewModel
  | AuctionDecisionViewModel
  | JailDecisionViewModel
  | LiquidationDecisionViewModel;

export interface DecisionHandlers {
  onBuy: () => void;
  onDecline: () => void;
  onBid: () => void;
  onBidAmountChange: (amount: number) => void;
  onPass: () => void;
  onPayJailFine: () => void;
  onUseJailCard: () => void;
}
