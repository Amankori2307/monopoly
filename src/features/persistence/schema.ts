import { z } from 'zod';
import {
  AuctionLedgerKind,
  BuildingKind,
  CardDeck,
  CardEffectKind,
  ColorGroup,
  DeckName,
  GameEventCue,
  MoveDirection,
  GameStatus,
  PendingDecisionType,
  SpaceKind,
  TableMode,
  TurnPhase,
} from '../../domain/types/game.enums';

/**
 * What a saved game has to look like to be loadable.
 *
 * This runs **after** the migrations, so it describes the current shape only -
 * an older save is brought up to it first. Everything here mirrors a type in
 * `domain/types/`; when one of those changes, this changes with it, and
 * `GAME_STATE_VERSION` goes up.
 *
 * It used to validate the important parts as `z.any()` - players, the board,
 * ownership, the decks, both in-flight states - which meant a corrupt player
 * object passed validation cleanly and blew up later in whichever component
 * happened to read it. The point of validating at the boundary is that the
 * failure lands here, where it can be reported, rather than mid-render.
 */

const gameStatusSchema = z.nativeEnum(GameStatus);

export const storedGameIndexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  themeId: z.string(),
  playerCount: z.number(),
  playerNames: z.array(z.string()),
  status: gameStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  turnNumber: z.number(),
  activePlayerId: z.string(),
  winnerPlayerId: z.string().nullable(),
  /**
   * Defaulted, NOT required - and that word is the difference between a
   * harmless field and losing every save on the home screen.
   *
   * This schema `.parse()`s and throws, and `bootstrapRecentGames` turns a
   * throw into `setRecentGames([])` plus a load error. So a required key here
   * would make every index written by an older build fail validation, and every
   * saved game would disappear from the front door while its per-game save sat
   * intact on disk beside it.
   *
   * An old entry reads hot-seat, which is true of every game written before
   * online play and harmless for the ones it is not: those were unresumable
   * anyway, because no build before this one persisted a join code. The index
   * then self-heals - `saveGame` rewrites it from these parsed values, so the
   * first command in any game puts the field on every entry.
   */
  tableMode: z.nativeEnum(TableMode).default(TableMode.HotSeat),
});

export const storedGameIndexSchema = z.array(storedGameIndexEntrySchema);

// -- Cards -------------------------------------------------------------------

const cardEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(CardEffectKind.Collect), amount: z.number() }),
  z.object({ kind: z.literal(CardEffectKind.Pay), amount: z.number() }),
  z.object({
    kind: z.literal(CardEffectKind.MoveTo),
    index: z.number().int().min(0),
    collectGo: z.boolean(),
  }),
  z.object({ kind: z.literal(CardEffectKind.MoveSteps), steps: z.number().int() }),
  z.object({ kind: z.literal(CardEffectKind.GoToJail) }),
  z.object({ kind: z.literal(CardEffectKind.JailFree) }),
  z.object({ kind: z.literal(CardEffectKind.CollectFromEach), amount: z.number() }),
  z.object({ kind: z.literal(CardEffectKind.PayEach), amount: z.number() }),
]);

const deckCardSchema = z.object({
  id: z.string(),
  deck: z.nativeEnum(CardDeck),
  title: z.string(),
  description: z.string(),
  effect: cardEffectSchema,
});

// -- Players -----------------------------------------------------------------

const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  cash: z.number(),
  position: z.number().int().min(0),
  inJail: z.boolean(),
  jailTurnsServed: z.number().int().min(0),
  /** The cards themselves, so each knows the deck it must return to. */
  jailFreeCards: z.array(deckCardSchema),
  isBankrupt: z.boolean(),
  bankruptcyRank: z.number().nullable(),
  hasPassedGo: z.boolean(),
  /** Which way they last travelled, so the walk animation replays it. */
  lastMove: z.nativeEnum(MoveDirection).nullable(),
});

// -- Board -------------------------------------------------------------------

const baseSpaceFields = {
  id: z.string(),
  index: z.number().int().min(0),
  name: z.string(),
};

const rentTableSchema = z.object({
  baseRent: z.number(),
  monopolyRent: z.number(),
  with1House: z.number(),
  with2Houses: z.number(),
  with3Houses: z.number(),
  with4Houses: z.number(),
  withHotel: z.number(),
});

/**
 * One space, by kind. A discriminated union rather than a loose object: the
 * engine reads `space.rents` on a street and `space.amount` on a tax square
 * without checking, so a space of the wrong shape is a crash waiting for
 * somebody to land on it.
 */
const boardSpaceSchema = z.discriminatedUnion('kind', [
  z.object({
    ...baseSpaceFields,
    kind: z.literal(SpaceKind.Street),
    colorGroup: z.nativeEnum(ColorGroup),
    price: z.number(),
    mortgageValue: z.number(),
    houseCost: z.number(),
    hotelCost: z.number(),
    rents: rentTableSchema,
  }),
  z.object({
    ...baseSpaceFields,
    kind: z.literal(SpaceKind.Railway),
    price: z.number(),
    mortgageValue: z.number(),
    rentByCount: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }),
  z.object({
    ...baseSpaceFields,
    kind: z.literal(SpaceKind.Utility),
    price: z.number(),
    mortgageValue: z.number(),
    rentMultiplierOne: z.number(),
    rentMultiplierBoth: z.number(),
  }),
  z.object({
    ...baseSpaceFields,
    kind: z.literal(SpaceKind.Tax),
    amount: z.number(),
  }),
  // Every space that is only a name and a rule the engine already knows.
  ...[
    SpaceKind.Go,
    SpaceKind.Chance,
    SpaceKind.CommunityChest,
    SpaceKind.Jail,
    SpaceKind.FreeParking,
    SpaceKind.GoToJail,
  ].map((kind) => z.object({ ...baseSpaceFields, kind: z.literal(kind) })),
]);

const ownershipSchema = z.object({
  ownerPlayerId: z.string().nullable(),
  mortgaged: z.boolean(),
  /** 0-4 houses, or HOTEL_BUILD_LEVEL for a hotel. */
  buildLevel: z.number().int().min(0).max(5),
});

// -- In-flight state ---------------------------------------------------------

const auctionLedgerEntrySchema = z.object({
  kind: z.nativeEnum(AuctionLedgerKind),
  playerId: z.string().nullable(),
  amount: z.number().nullable(),
});

const auctionStateSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  /** Set only when the auction is for a building rather than the property. */
  buildingKind: z.nativeEnum(BuildingKind).optional(),
  startPrice: z.number(),
  minIncrement: z.number(),
  activeBidderOrder: z.array(z.string()),
  activeBidderIndex: z.number().int().min(0),
  highestBid: z.number(),
  highestBidderId: z.string().nullable(),
  passedPlayerIds: z.array(z.string()),
  ledger: z.array(auctionLedgerEntrySchema),
});

const tradeStateSchema = z.object({
  proposerPlayerId: z.string(),
  recipientPlayerId: z.string(),
  offeredCash: z.number(),
  requestedCash: z.number(),
  offeredSpaceIds: z.array(z.string()),
  requestedSpaceIds: z.array(z.string()),
  offeredJailCards: z.number().int().min(0),
  requestedJailCards: z.number().int().min(0),
});

/**
 * The pending decision, described in full.
 *
 * It used to be `.passthrough()` with two refinements, so that a decision could
 * carry its own payload - the drawn card, a liquidation's queued debts - where
 * the surrounding `z.object` would strip an unknown key. On disk that was a
 * fair trade: the only writer was this app.
 *
 * Over a network it is not. A published state is validated with this schema
 * before it reaches the engine, and `.passthrough()` is precisely the hole
 * through which a peer could hang arbitrary keys off a decision. Writing the
 * union out costs a few lines and closes it, and it now describes every payload
 * rather than spot-checking two of them.
 *
 * Anything added to a decision needs a line here, exactly as the rest of the
 * save already does.
 */
const debtRecordSchema = z.object({
  playerId: z.string(),
  amountDue: z.number(),
  creditorPlayerId: z.string().nullable(),
  reason: z.string(),
});

const pendingDecisionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(PendingDecisionType.None) }),
  z.object({
    type: z.literal(PendingDecisionType.LandedUnownedProperty),
    spaceId: z.string(),
    playerId: z.string(),
  }),
  z.object({
    type: z.literal(PendingDecisionType.AuctionBid),
    auctionId: z.string(),
  }),
  z.object({
    type: z.literal(PendingDecisionType.JailChoice),
    playerId: z.string(),
  }),
  z.object({
    type: z.literal(PendingDecisionType.CardDraw),
    playerId: z.string(),
    deck: z.nativeEnum(DeckName),
    // The game cannot recover this: the card has already left the deck.
    card: deckCardSchema,
  }),
  debtRecordSchema.extend({
    type: z.literal(PendingDecisionType.AssetLiquidation),
    // Optional because a game saved before the queue existed comes back
    // without it, and the engine already reads it as `queued ?? []`.
    queued: z.array(debtRecordSchema).optional(),
  }),
  z.object({
    type: z.literal(PendingDecisionType.BuildingPlacement),
    playerId: z.string(),
    buildingKind: z.nativeEnum(BuildingKind),
    paidAmount: z.number(),
  }),
  z.object({
    type: z.literal(PendingDecisionType.TradeResponse),
    proposerPlayerId: z.string(),
    recipientPlayerId: z.string(),
  }),
  z.object({
    type: z.literal(PendingDecisionType.BankruptcyResolution),
    playerId: z.string(),
  }),
  z.object({
    type: z.literal(PendingDecisionType.SpeedDieBus),
    playerId: z.string(),
    whiteDice: z.tuple([z.number(), z.number()]),
  }),
  z.object({
    type: z.literal(PendingDecisionType.SpeedDieDestination),
    playerId: z.string(),
  }),
  z.object({ type: z.literal(PendingDecisionType.GameOver) }),
]);

// -- The game ----------------------------------------------------------------

export const gameStateSchema = z
  .object({
    version: z.number(),
    id: z.string(),
    name: z.string(),
    themeId: z.string(),
    rulesetId: z.string(),
    status: gameStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    players: z.record(playerSchema),
    playerOrder: z.array(z.string()).min(2),
    activePlayerIndex: z.number().int().min(0),
    turnNumber: z.number().int().min(0),
    board: z.array(boardSpaceSchema),
    ownership: z.record(ownershipSchema),
    bank: z.object({
      cash: z.literal('unlimited'),
      housesAvailable: z.number().int().min(0),
      hotelsAvailable: z.number().int().min(0),
    }),
    decks: z.object({
      chance: z.array(deckCardSchema),
      communityChest: z.array(deckCardSchema),
    }),
    turn: z.object({
      phase: z.nativeEnum(TurnPhase),
      doublesCount: z.number().int().min(0),
      lastRoll: z.array(z.number()).nullable(),
      canRollAgain: z.boolean(),
      reason: z.string().nullable(),
      // A new key in this object would be stripped on load without a line here.
      speedDieFace: z.string().nullable(),
      pendingMonopolyAdvance: z.boolean(),
      lastRollId: z.string().nullable(),
    }),
    pendingDecision: pendingDecisionSchema,
    useSpeedDie: z.boolean(),
    tableMode: z.nativeEnum(TableMode),
    tradeState: tradeStateSchema.nullable(),
    pendingAuctionSpaceIds: z.array(z.string()),
    auctionState: auctionStateSchema.nullable(),
    history: z.array(
      z.object({
        id: z.string(),
        turnNumber: z.number(),
        createdAt: z.string(),
        message: z.string(),
        cue: z.nativeEnum(GameEventCue),
      })
    ),
    winnerPlayerId: z.string().nullable(),
  })
  // The board is the one cross-field invariant worth checking: every other
  // reference in a save is an index or an id into it.
  .refine((game) => game.board.length === 40, {
    message: 'A saved board must have 40 spaces',
  })
  .refine((game) => game.activePlayerIndex < game.playerOrder.length, {
    message: 'activePlayerIndex points past the end of playerOrder',
  })
  .refine(
    (game) => game.playerOrder.every((playerId) => Boolean(game.players[playerId])),
    { message: 'playerOrder names a player the save does not contain' }
  );
