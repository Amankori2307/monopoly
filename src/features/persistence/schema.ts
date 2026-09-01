import { z } from 'zod';
import { GameEventTone } from '../../domain/types/game.enums';
import { PendingDecisionType } from '../../domain/types/game.enums';

export const storedGameIndexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  themeId: z.string(),
  playerCount: z.number(),
  playerNames: z.array(z.string()),
  status: z.union([
    z.literal('in_progress'),
    z.literal('completed'),
    z.literal('corrupt'),
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
  turnNumber: z.number(),
  activePlayerId: z.string(),
  winnerPlayerId: z.string().nullable(),
});

export const storedGameIndexSchema = z.array(storedGameIndexEntrySchema);

export const gameStateSchema = z.object({
  version: z.number(),
  id: z.string(),
  name: z.string(),
  themeId: z.string(),
  rulesetId: z.string(),
  status: z.union([
    z.literal('in_progress'),
    z.literal('completed'),
    z.literal('corrupt'),
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
  players: z.record(z.any()),
  playerOrder: z.array(z.string()),
  activePlayerIndex: z.number(),
  turnNumber: z.number(),
  board: z.array(z.any()),
  ownership: z.record(z.any()),
  bank: z.object({
    cash: z.literal('unlimited'),
    housesAvailable: z.number(),
    hotelsAvailable: z.number(),
  }),
  decks: z.object({
    chance: z.array(z.any()),
    communityChest: z.array(z.any()),
  }),
  turn: z.object({
    phase: z.string(),
    doublesCount: z.number(),
    lastRoll: z.array(z.number()).nullable(),
    canRollAgain: z.boolean(),
    reason: z.string().nullable(),
    // A new key in this object would be stripped on load without a line here.
    speedDieFace: z.string().nullable(),
    pendingMonopolyAdvance: z.boolean(),
  }),
  // Deliberately loose plus one targeted check. `.passthrough()` is what lets a
  // decision carry its own payload - notably the drawn Chance / Community Chest
  // card - through a save/load round trip; the surrounding z.object would
  // silently strip a new top-level GameState field instead. The refinement
  // guards the one payload the game stalls without.
  pendingDecision: z
    .object({
      type: z.string(),
    })
    .passthrough()
    .refine(
      (decision) =>
        decision.type !== PendingDecisionType.CardDraw ||
        typeof (decision as { card?: unknown }).card === 'object',
      { message: 'A card-draw decision must carry the drawn card' }
    ),
  useSpeedDie: z.boolean(),
  tradeState: z.any().nullable(),
  pendingAuctionSpaceIds: z.array(z.string()),
  auctionState: z.any().nullable(),
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
});
