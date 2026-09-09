import { GAME_STATE_VERSION } from '../../domain/constants/game.constants';
import {
  AuctionLedgerKind,
  CardDeck,
  CardEffectKind,
  GameEventCue,
} from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';

/**
 * Brings a saved game up to the current GAME_STATE_VERSION.
 *
 * Runs before validation, not after: the zod schema describes the *current*
 * shape, so an older save has to be made current first or it fails to parse and
 * the game is lost. Each step is keyed by the version it upgrades *from*.
 *
 * A step must be defensive - it is reading data written by an older build, so
 * it cannot assume anything the current types promise.
 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * v1 -> v2: the Speed Die, and Get Out of Jail Free cards that know their deck.
 *
 * v1 stored jailFreeCards as a count, which could not say which deck a card
 * came from - so a used card could never be returned and both left circulation
 * for good. A held count becomes that many Chance cards: the deck a v1 save's
 * card came from is genuinely unrecoverable, and Chance is the deck it is most
 * likely to have been.
 */
const v1ToV2: Migration = (raw) => {
  const players = (raw.players ?? {}) as Record<string, Record<string, unknown>>;
  const migratedPlayers: Record<string, unknown> = {};

  Object.entries(players).forEach(([playerId, player]) => {
    const held = player.jailFreeCards;
    migratedPlayers[playerId] = {
      ...player,
      jailFreeCards: Array.isArray(held)
        ? held
        : Array.from({ length: Number(held) || 0 }, (_, index) => ({
            id: `migrated-jail-free-${playerId}-${index}`,
            deck: CardDeck.Chance,
            title: 'Get Out of Jail Free',
            description: 'Keep this card until needed, or trade it.',
            effect: { kind: CardEffectKind.JailFree },
          })),
      // Nobody in a v1 save can be shown to have passed GO, and the flag only
      // gates the Speed Die - which a v1 game never had.
      hasPassedGo: player.hasPassedGo ?? false,
    };
  });

  const turn = (raw.turn ?? {}) as Record<string, unknown>;

  return {
    ...raw,
    version: 2,
    players: migratedPlayers,
    useSpeedDie: raw.useSpeedDie ?? false,
    turn: { ...turn, speedDieFace: turn.speedDieFace ?? null },
  };
};

/**
 * v2 -> v3: the Mr. Monopoly advance has to survive a decision, so it is a turn
 * field rather than something computed inline. A v2 game never had one owed.
 */
const v2ToV3: Migration = (raw) => {
  const turn = (raw.turn ?? {}) as Record<string, unknown>;
  return {
    ...raw,
    version: 3,
    turn: { ...turn, pendingMonopolyAdvance: turn.pendingMonopolyAdvance ?? false },
  };
};

/**
 * v3 -> v4: the auction queue.
 *
 * A bankruptcy to the bank used to return properties unowned; they are
 * auctioned now, and the queue is what holds the ones still to be sold. No save
 * can have been mid-queue, so it starts empty.
 */
const v3ToV4 = (raw: Record<string, unknown>): Record<string, unknown> => ({
  ...raw,
  pendingAuctionSpaceIds: [],
  version: 4,
});

/**
 * v4 -> v5: events carry their own tone.
 *
 * Toast colour used to be guessed from the wording, so old events are run
 * through that same reading once, here, rather than losing their colours. It is
 * the last time those patterns are needed.
 */
const v4ToV5 = (raw: Record<string, unknown>): Record<string, unknown> => {
  const history = Array.isArray(raw.history) ? raw.history : [];

  return {
    ...raw,
    history: history.map((event) => {
      const message = String((event as { message?: unknown }).message ?? '');
      return { ...(event as object), tone: toneFromWording(message) };
    }),
    version: 5,
  };
};

/**
 * The wording-based reading toasts used before events carried a tone.
 *
 * Returns the *v5* values as plain strings, not today's enum. A migration
 * reproduces the shape of the version it upgrades to, and nothing later: this
 * step wrote a `tone`, so it still writes one, and v7ToV8 converts it. Pointing
 * it at the current enum instead made v8 overwrite its own input with nothing.
 */
const toneFromWording = (message: string): string => {
  if (/\bpaid\b|\bbought\b|\bwon the auction\b|\bbid\b/i.test(message)) {
    return 'debit';
  }
  return /\bcollected\b|\breceived\b/i.test(message) ? 'credit' : 'neutral';
};

/**
 * v6 gave an auction a ledger of its bids and passes.
 *
 * A save caught mid-auction cannot have its bidding reconstructed - the old
 * shape never recorded the sequence - so it reopens showing the opening line
 * alone. Those bids are still in the game's own history, which is where they
 * were readable before this existed.
 */
const v5ToV6 = (raw: Record<string, unknown>): Record<string, unknown> => {
  const auction = raw.auctionState;

  if (typeof auction !== 'object' || auction === null) {
    return { ...raw, version: 6 };
  }

  const startPrice = Number((auction as { startPrice?: unknown }).startPrice) || 0;

  return {
    ...raw,
    auctionState: {
      ...(auction as object),
      ledger: [{ kind: AuctionLedgerKind.Start, playerId: null, amount: startPrice }],
    },
    version: 6,
  };
};

/**
 * v7 recorded which way each player last travelled.
 *
 * An older save cannot say - the direction was an argument that went nowhere -
 * so every player comes back with none, and the animation treats a token with no
 * recorded direction as having gone forward. That only matters if a save is
 * caught mid-walk, and a reload does not resume one.
 */
const v6ToV7 = (raw: Record<string, unknown>): Record<string, unknown> => {
  const players = raw.players;

  if (typeof players !== 'object' || players === null) {
    return { ...raw, version: 7 };
  }

  return {
    ...raw,
    players: Object.fromEntries(
      Object.entries(players as Record<string, unknown>).map(([id, player]) => [
        id,
        { ...(player as object), lastMove: null },
      ])
    ),
    version: 7,
  };
};

/**
 * v8 widened the event's `tone` into a `cue`.
 *
 * Three tones became ten cues, because the same field now decides the sound as
 * well as the toast's colour. An older save only ever knew the three, so each
 * maps to its like and a neutral event simply makes no sound.
 */
const v7ToV8 = (raw: Record<string, unknown>): Record<string, unknown> => {
  const history = Array.isArray(raw.history) ? raw.history : [];
  const cueForTone: Record<string, GameEventCue> = {
    debit: GameEventCue.Debit,
    credit: GameEventCue.Credit,
    neutral: GameEventCue.None,
  };

  return {
    ...raw,
    history: history.map((event) => {
      const { tone, ...rest } = event as { tone?: unknown };
      return { ...rest, cue: cueForTone[String(tone)] ?? GameEventCue.None };
    }),
    version: 8,
  };
};

/**
 * v8 -> v9: a table mode, and an id for the last throw of the dice.
 *
 * Both exist for online play, and both are pure defaults for a save written
 * before it: every existing game is hot-seat, and `lastRollId` starts null
 * because nothing has been rolled since the id existed - the dice on screen are
 * a record of a throw this device already animated.
 *
 * Writes v9's shape and no later one's, per the rule this file learned the hard
 * way at v4/v8.
 */
/**
 * Repairs a game deadlocked by a jail-choice decision nobody could answer.
 *
 * Two of the three exits from `attemptJailRoll` left `pendingDecision` at
 * `jail-choice` after the player had already left Jail. `resolveCurrentSpace`
 * reads `pendingDecision.type !== 'none'` to pick the phase, so the turn went
 * to `await_decision` - while the Jail panel, which renders from
 * `player.inJail`, had stopped rendering. No modal, no Roll, no End turn.
 *
 * The command is fixed, but a save already in that state stays dead, and the
 * state is on disk rather than in memory. So this makes it legal again: the
 * decision goes, and the turn becomes one the player can end - which is what
 * the roll had already earned them.
 *
 * Deliberately narrow. It fires only on the exact contradiction - a jail-choice
 * naming a player who is not in Jail - and leaves a legitimate jail-choice, the
 * one a jailed player is answering right now, completely alone.
 */
const v9ToV10 = (raw: Record<string, unknown>): Record<string, unknown> => {
  const decision = (raw.pendingDecision ?? {}) as Record<string, unknown>;
  const players = (raw.players ?? {}) as Record<string, Record<string, unknown>>;
  const owner = players[String(decision.playerId)];
  const isStuck = decision.type === 'jail-choice' && owner != null && !owner.inJail;

  if (!isStuck) {
    return { ...raw, version: 10 };
  }

  const turn = (raw.turn ?? {}) as Record<string, unknown>;
  return {
    ...raw,
    pendingDecision: { type: 'none' },
    turn: { ...turn, phase: 'turn_complete', reason: null, canRollAgain: false },
    version: 10,
  };
};

const v8ToV9 = (raw: Record<string, unknown>): Record<string, unknown> => {
  const turn = (raw.turn ?? {}) as Record<string, unknown>;

  return {
    ...raw,
    tableMode: 'hot-seat',
    turn: { ...turn, lastRollId: null },
    version: 9,
  };
};

const MIGRATIONS: Record<number, Migration> = {
  1: v1ToV2,
  2: v2ToV3,
  3: v3ToV4,
  4: v4ToV5,
  5: v5ToV6,
  6: v6ToV7,
  7: v7ToV8,
  8: v8ToV9,
  9: v9ToV10,
};

/**
 * Applies every migration between a save's version and the current one.
 *
 * An unknown or future version is passed through untouched: validation is what
 * decides whether it can be loaded, and guessing at a shape from the future
 * would corrupt it.
 */
export const migrateSavedGame = (raw: unknown): unknown => {
  if (typeof raw !== 'object' || raw === null) {
    return raw;
  }

  let current = raw as Record<string, unknown>;
  let version = Number(current.version) || 0;

  while (version < GAME_STATE_VERSION && MIGRATIONS[version]) {
    current = MIGRATIONS[version](current);
    version = Number(current.version) || version + 1;
  }

  return current;
};

/** True when a save is old enough to need work before it can be parsed. */
export const needsMigration = (raw: unknown): boolean =>
  typeof raw === 'object' &&
  raw !== null &&
  (Number((raw as { version?: unknown }).version) || 0) < GAME_STATE_VERSION;

export type { GameState };
