/**
 * Closed sets of game values. Prefer an enum member over a bare string literal
 * anywhere in the codebase - the compiler then catches typos and renames, and
 * every valid value is discoverable from one place.
 *
 * These are string enums, so they serialise to their plain string values and
 * stay compatible with previously saved games.
 */

export enum GameStatus {
  InProgress = 'in_progress',
  Completed = 'completed',
  Corrupt = 'corrupt',
}

export enum TurnPhase {
  AwaitRoll = 'await_roll',
  ResolvingMovement = 'resolving_movement',
  ResolvingSpace = 'resolving_space',
  AwaitDecision = 'await_decision',
  AwaitExtraRollOrEnd = 'await_extra_roll_or_end',
  TurnComplete = 'turn_complete',
}

export enum SpaceKind {
  Go = 'go',
  Street = 'street',
  Railway = 'railway',
  Utility = 'utility',
  Tax = 'tax',
  Chance = 'chance',
  CommunityChest = 'community-chest',
  Jail = 'jail',
  FreeParking = 'free-parking',
  GoToJail = 'go-to-jail',
}

/** The eight street colour groups. Also the source of the SCSS `.group-*` classes. */
export enum ColorGroup {
  Brown = 'brown',
  LightBlue = 'light-blue',
  Pink = 'pink',
  Orange = 'orange',
  Red = 'red',
  Yellow = 'yellow',
  Green = 'green',
  DarkBlue = 'dark-blue',
}

export enum PendingDecisionType {
  None = 'none',
  LandedUnownedProperty = 'landed-unowned-property',
  AuctionBid = 'auction-bid',
  JailChoice = 'jail-choice',
  CardDraw = 'card-draw',
  AssetLiquidation = 'asset-liquidation',
  TradeResponse = 'trade-response',
  BankruptcyResolution = 'bankruptcy-resolution',
  /** A Bus face: pick one white die, or both, and move that many. */
  SpeedDieBus = 'speed-die-bus',
  /** All three dice matched: pick any space on the board. */
  SpeedDieDestination = 'speed-die-destination',
  /** Won a building at auction: pick which of your sites it goes on. */
  BuildingPlacement = 'building-placement',
  GameOver = 'game-over',
}

export enum DeckName {
  Chance = 'chance',
  CommunityChest = 'communityChest',
}

/**
 * The six faces of the Speed Die. Three are numbers added to the white dice;
 * the other three are the rules that make it a different game.
 */
export enum SpeedDieFace {
  One = '1',
  Two = '2',
  Three = '3',
  Bus = 'bus',
  MrMonopoly = 'mr-monopoly',
}

export enum CardDeck {
  Chance = 'chance',
  CommunityChest = 'community-chest',
}

export enum CardEffectKind {
  Collect = 'collect',
  Pay = 'pay',
  MoveTo = 'move-to',
  MoveSteps = 'move-steps',
  GoToJail = 'go-to-jail',
  JailFree = 'jail-free',
  CollectFromEach = 'collect-from-each',
  PayEach = 'pay-each',
}

export enum GameCommandType {
  CreateGame = 'createGame',
  RollTurnDice = 'rollTurnDice',
  BuyLandedAsset = 'buyLandedAsset',
  DeclineLandedAsset = 'declineLandedAsset',
  SubmitAuctionBid = 'submitAuctionBid',
  PassAuction = 'passAuction',
  PayJailFine = 'payJailFine',
  UseJailFreeCard = 'useJailFreeCard',
  AttemptJailRoll = 'attemptJailRoll',
  AcknowledgeCard = 'acknowledgeCard',
  SettleDebt = 'settleDebt',
  EndTurn = 'endTurn',
  BuildHouse = 'buildHouse',
  BuildHotel = 'buildHotel',
  SellHouse = 'sellHouse',
  SellHotel = 'sellHotel',
  ChooseBuildingSite = 'chooseBuildingSite',
  MortgageAsset = 'mortgageAsset',
  UnmortgageAsset = 'unmortgageAsset',
  ProposeTrade = 'proposeTrade',
  ChooseBusMove = 'chooseBusMove',
  ChooseSpeedDieDestination = 'chooseSpeedDieDestination',
  AcceptTrade = 'acceptTrade',
  RejectTrade = 'rejectTrade',
  ConfirmBankruptcy = 'confirmBankruptcy',
}

/**
 * Which edge of the board a space sits on. Drives where its colour ribbon goes:
 * always the cell's short side, on the edge facing the board centre.
 */
export enum BoardSide {
  Bottom = 'bottom',
  Left = 'left',
  Top = 'top',
  Right = 'right',
}

/** Property-management actions offered on the action rail. */
export enum PropertyAction {
  Build = 'build',
  Sell = 'sell',
  Mortgage = 'mortgage',
  Redeem = 'redeem',
}

/** What a player receiving a mortgaged site in a trade elects to do about it. */
export enum MortgageChoice {
  /** Clear the mortgage now: mortgage value plus interest, and it comes free. */
  Redeem = 'redeem',
  /** Pay the interest only, and take it still mortgaged. */
  Keep = 'keep',
}

/** What is being auctioned when the bank runs short of buildings. */
export enum BuildingKind {
  House = 'house',
  Hotel = 'hotel',
}

/**
 * Which way money moved in an event, if it moved at all.
 *
 * Set by the engine at the three money choke points rather than guessed from
 * the wording afterwards - the sentence is for players, not for parsing.
 */
export enum GameEventTone {
  Debit = 'debit',
  Credit = 'credit',
  Neutral = 'neutral',
}
