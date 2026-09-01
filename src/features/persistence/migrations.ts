import { GAME_STATE_VERSION } from '../../domain/constants/game.constants';
import {
  AuctionLedgerKind,
  CardDeck,
  CardEffectKind,
  GameEventTone,
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

/** The wording-based reading toasts used before events carried a tone. */
const toneFromWording = (message: string): GameEventTone => {
  if (/\bpaid\b|\bbought\b|\bwon the auction\b|\bbid\b/i.test(message)) {
    return GameEventTone.Debit;
  }
  return /\bcollected\b|\breceived\b/i.test(message)
    ? GameEventTone.Credit
    : GameEventTone.Neutral;
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

const MIGRATIONS: Record<number, Migration> = {
  1: v1ToV2,
  2: v2ToV3,
  3: v3ToV4,
  4: v4ToV5,
  5: v5ToV6,
  6: v6ToV7,
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
