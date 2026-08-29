import { z } from 'zod';

export const storedGameIndexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  themeId: z.string(),
  playerCount: z.number(),
  playerNames: z.array(z.string()),
  status: z.union([z.literal('in_progress'), z.literal('completed'), z.literal('corrupt')]),
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
  status: z.union([z.literal('in_progress'), z.literal('completed'), z.literal('corrupt')]),
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
  }),
  pendingDecision: z.object({
    type: z.string(),
  }).passthrough(),
  tradeState: z.any().nullable(),
  auctionState: z.any().nullable(),
  history: z.array(
    z.object({
      id: z.string(),
      turnNumber: z.number(),
      createdAt: z.string(),
      message: z.string(),
    })
  ),
  winnerPlayerId: z.string().nullable(),
});
