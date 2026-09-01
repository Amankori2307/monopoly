import { z } from 'zod';
import {
  BuildingKind,
  CardDeck,
  CardEffectKind,
  ColorGroup,
  GameEventTone,
  GameStatus,
  PendingDecisionType,
  SpaceKind,
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
 * The pending decision stays loose, deliberately, and it is the only thing that
 * does.
 *
 * `.passthrough()` is what lets a decision carry its own payload through a
 * save/load round trip - the drawn card, a liquidation's queued debts - where
 * the surrounding `z.object` would strip an unknown key. The refinements below
 * guard the payloads the game cannot recover without.
 */
const pendingDecisionSchema = z
  .object({ type: z.nativeEnum(PendingDecisionType) })
  .passthrough()
  .refine(
    (decision) =>
      decision.type !== PendingDecisionType.CardDraw ||
      typeof (decision as { card?: unknown }).card === 'object',
    { message: 'A card-draw decision must carry the drawn card' }
  )
  .refine(
    (decision) =>
      decision.type !== PendingDecisionType.AssetLiquidation ||
      typeof (decision as { amountDue?: unknown }).amountDue === 'number',
    { message: 'A liquidation decision must carry the amount owed' }
  );

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
    }),
    pendingDecision: pendingDecisionSchema,
    useSpeedDie: z.boolean(),
    tradeState: tradeStateSchema.nullable(),
    pendingAuctionSpaceIds: z.array(z.string()),
    auctionState: auctionStateSchema.nullable(),
    history: z.array(
      z.object({
        id: z.string(),
        turnNumber: z.number(),
        createdAt: z.string(),
        message: z.string(),
        tone: z.nativeEnum(GameEventTone),
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
