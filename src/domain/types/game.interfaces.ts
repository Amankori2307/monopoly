/**
 * Every shape the game is built from. Extend here rather than declaring local
 * structural types, so there is one place to look for the model.
 *
 * Closed value sets live in game.enums.ts; ruleset numbers in
 * ../constants/game.constants.ts.
 */
import type {
  CardDeck,
  CardEffectKind,
  ColorGroup,
  DeckName,
  GameCommandType,
  GameStatus,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from './game.enums';

export type GameId = string;
export type PlayerId = string;
export type SpaceId = string;
export type CardId = string;
export type ThemeId = string;
export type AuctionId = string;
export type RulesetId = string;
export type TokenId = string;

// -- Board -------------------------------------------------------------------

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
  kind: SpaceKind.Street;
  colorGroup: ColorGroup;
  price: number;
  mortgageValue: number;
  houseCost: number;
  hotelCost: number;
  rents: StreetRentTable;
}

export interface RailwaySpace extends BaseSpace {
  kind: SpaceKind.Railway;
  price: number;
  mortgageValue: number;
  rentByCount: [number, number, number, number];
}

export interface UtilitySpace extends BaseSpace {
  kind: SpaceKind.Utility;
  price: number;
  mortgageValue: number;
  rentMultiplierOne: number;
  rentMultiplierBoth: number;
}

export interface TaxSpace extends BaseSpace {
  kind: SpaceKind.Tax;
  amount: number;
}

export interface ActionSpace extends BaseSpace {
  kind:
    | SpaceKind.Go
    | SpaceKind.Chance
    | SpaceKind.CommunityChest
    | SpaceKind.Jail
    | SpaceKind.FreeParking
    | SpaceKind.GoToJail;
}

export type BoardSpace =
  | StreetSpace
  | RailwaySpace
  | UtilitySpace
  | TaxSpace
  | ActionSpace;

/** Spaces a player can own. */
export type OwnableSpace = StreetSpace | RailwaySpace | UtilitySpace;

// -- Players and ownership ---------------------------------------------------

export interface PlayerState {
  id: PlayerId;
  name: string;
  tokenId: TokenId;
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

// -- Cards -------------------------------------------------------------------

export type CardEffect =
  | { kind: CardEffectKind.Collect; amount: number }
  | { kind: CardEffectKind.Pay; amount: number }
  | { kind: CardEffectKind.MoveTo; index: number; collectGo: boolean }
  | { kind: CardEffectKind.MoveSteps; steps: number }
  | { kind: CardEffectKind.GoToJail }
  | { kind: CardEffectKind.JailFree }
  | { kind: CardEffectKind.CollectFromEach; amount: number }
  | { kind: CardEffectKind.PayEach; amount: number };

export interface DeckCard {
  id: CardId;
  deck: CardDeck;
  title: string;
  description: string;
  effect: CardEffect;
}

export type DeckState = Record<DeckName, DeckCard[]>;

// -- Turn and decisions ------------------------------------------------------

export interface TurnState {
  phase: TurnPhase;
  doublesCount: number;
  lastRoll: number[] | null;
  canRollAgain: boolean;
  reason: string | null;
}

export interface PendingDecisionNone {
  type: PendingDecisionType.None;
}

export interface PendingDecisionProperty {
  type: PendingDecisionType.LandedUnownedProperty;
  spaceId: SpaceId;
  playerId: PlayerId;
}

export interface PendingDecisionAuction {
  type: PendingDecisionType.AuctionBid;
  auctionId: AuctionId;
}

export interface PendingDecisionJail {
  type: PendingDecisionType.JailChoice;
  playerId: PlayerId;
}

/**
 * A drawn Chance or Community Chest card, waiting to be acknowledged. The card
 * rides inside the decision rather than in a field of its own on GameState:
 * schema.ts validates pendingDecision with `.passthrough()`, so it survives a
 * save/load round trip, whereas a new top-level field would be silently
 * stripped by the surrounding `z.object`.
 */
export interface PendingDecisionCardDraw {
  type: PendingDecisionType.CardDraw;
  playerId: PlayerId;
  deck: DeckName;
  card: DeckCard;
}

export interface PendingDecisionAssetLiquidation {
  type: PendingDecisionType.AssetLiquidation;
  playerId: PlayerId;
  amountDue: number;
  creditorPlayerId: PlayerId | null;
  reason: string;
}

export interface PendingDecisionTrade {
  type: PendingDecisionType.TradeResponse;
  proposerPlayerId: PlayerId;
  recipientPlayerId: PlayerId;
}

export interface PendingDecisionBankruptcy {
  type: PendingDecisionType.BankruptcyResolution;
  playerId: PlayerId;
}

export interface PendingDecisionGameOver {
  type: PendingDecisionType.GameOver;
}

export type PendingDecision =
  | PendingDecisionNone
  | PendingDecisionProperty
  | PendingDecisionAuction
  | PendingDecisionJail
  | PendingDecisionCardDraw
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

// -- Theme -------------------------------------------------------------------

export interface ThemeToken {
  id: TokenId;
  label: string;
  emoji: string;
  color: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  currencySymbol: string;
  tokenCatalog: ThemeToken[];
}

// -- Root state --------------------------------------------------------------

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

// -- Commands ----------------------------------------------------------------

export interface CreatePlayerInput {
  name: string;
  tokenId: TokenId;
}

export interface CreateGameInput {
  gameId?: GameId;
  name?: string;
  playerConfigs: CreatePlayerInput[];
  themeId: ThemeId;
  createdAt: string;
}

export type GameCommand =
  | { type: GameCommandType.CreateGame; payload: CreateGameInput }
  | { type: GameCommandType.RollTurnDice }
  | { type: GameCommandType.BuyLandedAsset }
  | { type: GameCommandType.DeclineLandedAsset }
  | { type: GameCommandType.SubmitAuctionBid; amount: number }
  | { type: GameCommandType.PassAuction }
  | { type: GameCommandType.PayJailFine }
  | { type: GameCommandType.UseJailFreeCard }
  | { type: GameCommandType.AttemptJailRoll }
  | { type: GameCommandType.AcknowledgeCard }
  | { type: GameCommandType.EndTurn }
  | { type: GameCommandType.BuildHouse; spaceId: SpaceId }
  | { type: GameCommandType.BuildHotel; spaceId: SpaceId }
  | { type: GameCommandType.SellHouse; spaceId: SpaceId }
  | { type: GameCommandType.SellHotel; spaceId: SpaceId }
  | { type: GameCommandType.MortgageAsset; spaceId: SpaceId }
  | { type: GameCommandType.UnmortgageAsset; spaceId: SpaceId }
  | { type: GameCommandType.ProposeTrade; payload: TradeState }
  | { type: GameCommandType.AcceptTrade }
  | { type: GameCommandType.RejectTrade }
  | { type: GameCommandType.ConfirmBankruptcy };

/** Any command the UI may dispatch after the game exists. */
export type RuntimeGameCommand = Exclude<
  GameCommand,
  { type: GameCommandType.CreateGame }
>;

export interface GameCommandResult {
  nextState: GameState;
  events: GameEvent[];
  saveRequired: boolean;
  uiHints: string[];
}
