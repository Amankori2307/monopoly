export type GameId = string;
export type PlayerId = string;
export type SpaceId = string;
export type CardId = string;
export type ThemeId = string;
export type AuctionId = string;
export type RulesetId = string;

export type GameStatus = 'in_progress' | 'completed' | 'corrupt';
export type TurnPhase =
  | 'await_roll'
  | 'resolving_movement'
  | 'resolving_space'
  | 'await_decision'
  | 'await_extra_roll_or_end'
  | 'turn_complete';

export type SpaceKind =
  | 'go'
  | 'street'
  | 'railway'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community-chest'
  | 'jail'
  | 'free-parking'
  | 'go-to-jail';

export type PendingDecisionType =
  | 'none'
  | 'landed-unowned-property'
  | 'auction-bid'
  | 'jail-choice'
  | 'asset-liquidation'
  | 'trade-response'
  | 'bankruptcy-resolution'
  | 'game-over';

export interface StreetRentTable {
  baseRent: number;
  monopolyRent: number;
  with1House: number;
  with2Houses: number;
  with3Houses: number;
  with4Houses: number;
  withHotel: number;
}

export interface BaseSpace {
  id: SpaceId;
  index: number;
  name: string;
  kind: SpaceKind;
}

export interface StreetSpace extends BaseSpace {
  kind: 'street';
  colorGroup: string;
  price: number;
  mortgageValue: number;
  houseCost: number;
  hotelCost: number;
  rents: StreetRentTable;
}

export interface RailwaySpace extends BaseSpace {
  kind: 'railway';
  price: number;
  mortgageValue: number;
  rentByCount: [number, number, number, number];
}

export interface UtilitySpace extends BaseSpace {
  kind: 'utility';
  price: number;
  mortgageValue: number;
  rentMultiplierOne: number;
  rentMultiplierBoth: number;
}

export interface TaxSpace extends BaseSpace {
  kind: 'tax';
  amount: number;
}

export interface ActionSpace extends BaseSpace {
  kind:
    | 'go'
    | 'chance'
    | 'community-chest'
    | 'jail'
    | 'free-parking'
    | 'go-to-jail';
}

export type BoardSpace =
  | StreetSpace
  | RailwaySpace
  | UtilitySpace
  | TaxSpace
  | ActionSpace;

export interface PlayerState {
  id: PlayerId;
  name: string;
  tokenId: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurnsServed: number;
  jailFreeCards: number;
  isBankrupt: boolean;
  bankruptcyRank: number | null;
}

export interface OwnershipState {
  ownerPlayerId: PlayerId | null;
  mortgaged: boolean;
  buildLevel: number;
}

export interface BankState {
  cash: 'unlimited';
  housesAvailable: number;
  hotelsAvailable: number;
}

export interface DeckCard {
  id: CardId;
  deck: 'chance' | 'community-chest';
  title: string;
  description: string;
  effect:
    | { kind: 'collect'; amount: number }
    | { kind: 'pay'; amount: number }
    | { kind: 'move-to'; index: number; collectGo: boolean }
    | { kind: 'move-steps'; steps: number }
    | { kind: 'go-to-jail' }
    | { kind: 'jail-free' }
    | { kind: 'collect-from-each'; amount: number }
    | { kind: 'pay-each'; amount: number };
}

export interface DeckState {
  chance: DeckCard[];
  communityChest: DeckCard[];
}

export interface TurnState {
  phase: TurnPhase;
  doublesCount: number;
  lastRoll: number[] | null;
  canRollAgain: boolean;
  reason: string | null;
}

export interface PendingDecisionBase {
  type: PendingDecisionType;
}

export interface PendingDecisionNone extends PendingDecisionBase {
  type: 'none';
}

export interface PendingDecisionProperty extends PendingDecisionBase {
  type: 'landed-unowned-property';
  spaceId: SpaceId;
  playerId: PlayerId;
}

export interface PendingDecisionAuction extends PendingDecisionBase {
  type: 'auction-bid';
  auctionId: AuctionId;
}

export interface PendingDecisionJail extends PendingDecisionBase {
  type: 'jail-choice';
  playerId: PlayerId;
}

export interface PendingDecisionAssetLiquidation extends PendingDecisionBase {
  type: 'asset-liquidation';
  playerId: PlayerId;
  amountDue: number;
  creditorPlayerId: PlayerId | null;
  reason: string;
}

export interface PendingDecisionTrade extends PendingDecisionBase {
  type: 'trade-response';
  proposerPlayerId: PlayerId;
  recipientPlayerId: PlayerId;
}

export interface PendingDecisionBankruptcy extends PendingDecisionBase {
  type: 'bankruptcy-resolution';
  playerId: PlayerId;
}

export interface PendingDecisionGameOver extends PendingDecisionBase {
  type: 'game-over';
}

export type PendingDecision =
  | PendingDecisionNone
  | PendingDecisionProperty
  | PendingDecisionAuction
  | PendingDecisionJail
  | PendingDecisionAssetLiquidation
  | PendingDecisionTrade
  | PendingDecisionBankruptcy
  | PendingDecisionGameOver;

export interface AuctionState {
  id: AuctionId;
  spaceId: SpaceId;
  startPrice: number;
  minIncrement: number;
  activeBidderOrder: PlayerId[];
  activeBidderIndex: number;
  highestBid: number;
  highestBidderId: PlayerId | null;
  passedPlayerIds: PlayerId[];
}

export interface TradeState {
  proposerPlayerId: PlayerId;
  recipientPlayerId: PlayerId;
  offeredCash: number;
  requestedCash: number;
  offeredSpaceIds: SpaceId[];
  requestedSpaceIds: SpaceId[];
  offeredJailCards: number;
  requestedJailCards: number;
}

export interface GameEvent {
  id: string;
  turnNumber: number;
  createdAt: string;
  message: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  currencySymbol: string;
  accentColor: string;
  background: string;
  tokenCatalog: Array<{ id: string; label: string; emoji: string; color: string }>;
}

export interface GameState {
  version: number;
  id: GameId;
  name: string;
  themeId: ThemeId;
  rulesetId: RulesetId;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  players: Record<PlayerId, PlayerState>;
  playerOrder: PlayerId[];
  activePlayerIndex: number;
  turnNumber: number;
  board: BoardSpace[];
  ownership: Record<SpaceId, OwnershipState>;
  bank: BankState;
  decks: DeckState;
  turn: TurnState;
  pendingDecision: PendingDecision;
  tradeState: TradeState | null;
  auctionState: AuctionState | null;
  history: GameEvent[];
  winnerPlayerId: PlayerId | null;
}

export interface StoredGameIndexEntry {
  id: GameId;
  name: string;
  themeId: ThemeId;
  playerCount: number;
  playerNames: string[];
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  turnNumber: number;
  activePlayerId: PlayerId;
  winnerPlayerId: PlayerId | null;
}

export interface CreatePlayerInput {
  name: string;
  tokenId: string;
}

export interface CreateGameInput {
  gameId?: GameId;
  name?: string;
  playerConfigs: CreatePlayerInput[];
  themeId: ThemeId;
  createdAt: string;
}

export type GameCommand =
  | { type: 'createGame'; payload: CreateGameInput }
  | { type: 'rollTurnDice' }
  | { type: 'buyLandedAsset' }
  | { type: 'declineLandedAsset' }
  | { type: 'submitAuctionBid'; amount: number }
  | { type: 'passAuction' }
  | { type: 'payJailFine' }
  | { type: 'useJailFreeCard' }
  | { type: 'attemptJailRoll' }
  | { type: 'endTurn' }
  | { type: 'buildHouse'; spaceId: SpaceId }
  | { type: 'buildHotel'; spaceId: SpaceId }
  | { type: 'sellHouse'; spaceId: SpaceId }
  | { type: 'sellHotel'; spaceId: SpaceId }
  | { type: 'mortgageAsset'; spaceId: SpaceId }
  | { type: 'unmortgageAsset'; spaceId: SpaceId }
  | { type: 'proposeTrade'; payload: TradeState }
  | { type: 'acceptTrade' }
  | { type: 'rejectTrade' }
  | { type: 'confirmBankruptcy' };

export interface GameCommandResult {
  nextState: GameState;
  events: GameEvent[];
  saveRequired: boolean;
  uiHints: string[];
}
