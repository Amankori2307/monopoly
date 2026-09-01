/**
 * Every shape the game is built from. Extend here rather than declaring local
 * structural types, so there is one place to look for the model.
 *
 * Closed value sets live in game.enums.ts; ruleset numbers in
 * ../constants/game.constants.ts.
 */
import type {
  BuildingKind,
  CardDeck,
  CardEffectKind,
  ColorGroup,
  DeckName,
  MortgageChoice,
  SpeedDieFace,
  GameCommandType,
  GameEventTone,
  GameStatus,
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
  /**
   * The Get Out of Jail Free cards this player is holding, as cards rather than
   * a count. A count could not say which deck one came from, so a used card
   * could never go back and both left circulation permanently.
   */
  jailFreeCards: DeckCard[];
  isBankrupt: boolean;
  bankruptcyRank: number | null;
  /** The Speed Die stays out of play until every player has been round once. */
  hasPassedGo: boolean;
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
  /** The two white dice. The Speed Die is kept separate - see speedDieFace. */
  lastRoll: number[] | null;
  canRollAgain: boolean;
  reason: string | null;
  /**
   * The Speed Die's face this turn, or null when it was not rolled. Separate
   * from lastRoll on purpose: only the white dice decide doubles and Jail, and
   * a third entry in that array would have to be excluded at every reader.
   */
  speedDieFace: SpeedDieFace | null;
  /**
   * True while a Mr. Monopoly advance is owed. The advance happens *after* the
   * landed space is resolved, and that space may itself raise a decision - so
   * it cannot simply run inline, and has to survive until the turn is clear.
   */
  pendingMonopolyAdvance: boolean;
}

import type { PendingDecision } from './decisions.interfaces';

export type {
  DebtRecord,
  PendingDecision,
  PendingDecisionAssetLiquidation,
  PendingDecisionAuction,
  PendingDecisionBankruptcy,
  PendingDecisionBuildingPlacement,
  PendingDecisionCardDraw,
  PendingDecisionGameOver,
  PendingDecisionJail,
  PendingDecisionNone,
  PendingDecisionProperty,
  PendingDecisionSpeedDieBus,
  PendingDecisionSpeedDieDestination,
  PendingDecisionTrade,
} from './decisions.interfaces';

export interface AuctionState {
  id: AuctionId;
  /**
   * The property being auctioned, or - for a building auction - the site whose
   * build request triggered it. The winner of a building auction picks their
   * own site, so this is only what set the opening price.
   */
  spaceId: SpaceId;
  /**
   * Set when the bank is short of buildings and this auction is for one of
   * them rather than for the property itself.
   */
  buildingKind?: BuildingKind;
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
  /** Which way money moved, set where it moved. */
  tone: GameEventTone;
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
  /**
   * Properties waiting to be auctioned, oldest first.
   *
   * A bankruptcy to the bank returns everything at once, and the printed rule
   * has the bank auction each one - so they queue and are sold in turn. Only
   * one auction can run at a time.
   */
  pendingAuctionSpaceIds: SpaceId[];
  auctionState: AuctionState | null;
  history: GameEvent[];
  winnerPlayerId: PlayerId | null;
  /**
   * Whether this game plays with the Speed Die. Fixed at setup - the printed
   * rule has it agreed before play starts, not switched on mid-game.
   */
  useSpeedDie: boolean;
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
  /** Agreed before the game starts, and fixed for its lifetime. */
  useSpeedDie?: boolean;
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
  | { type: GameCommandType.SettleDebt }
  | { type: GameCommandType.EndTurn }
  | { type: GameCommandType.BuildHouse; spaceId: SpaceId }
  | { type: GameCommandType.BuildHotel; spaceId: SpaceId }
  | { type: GameCommandType.SellHouse; spaceId: SpaceId }
  | { type: GameCommandType.SellHotel; spaceId: SpaceId }
  | { type: GameCommandType.ChooseBuildingSite; spaceId: SpaceId }
  | { type: GameCommandType.MortgageAsset; spaceId: SpaceId }
  | { type: GameCommandType.UnmortgageAsset; spaceId: SpaceId }
  | { type: GameCommandType.ProposeTrade; payload: TradeState }
  | { type: GameCommandType.ChooseBusMove; steps: number }
  | { type: GameCommandType.ChooseSpeedDieDestination; spaceId: SpaceId }
  | {
      type: GameCommandType.AcceptTrade;
      /**
       * What the receiver does about each mortgaged site coming to them:
       * `redeem` clears the mortgage now, `keep` pays the 10% and leaves it
       * mortgaged. Sites left out default to `keep`.
       */
      mortgageChoices?: Record<SpaceId, MortgageChoice>;
    }
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
  /**
   * Advisory notes for the UI. Empty since every command was implemented - the
   * only messages it ever carried were "not implemented yet". Kept in the
   * contract for a future command that needs to say something the history does
   * not; nothing renders it today.
   */
  uiHints: string[];
}
