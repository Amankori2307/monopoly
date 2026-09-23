import { MAX_PLAYERS } from '../constants/game.constants';
import type { PlayerColor } from './theme.interfaces';

/**
 * What tells two players apart, everywhere in the app.
 *
 * This used to be a `tokenCatalog` on each of the four editions - eight playing
 * pieces with a name, an emoji and a colour, which a player picked at setup.
 * Two things were true of it and neither was obvious until they were counted:
 *
 *   - **The piece was never drawn.** `BoardTokenLayer` renders a self-closing
 *     span with `backgroundColor`, so an elephant and a top hat are the same
 *     circle in two colours. The emoji reached four bits of text beside a name
 *     and nothing else.
 *   - **All four editions listed the SAME eight colours in the same order.** So
 *     the catalog was already this list, wearing four sets of names.
 *
 * Hence one list, indexed by the order players were created in, assigned by the
 * engine. A duplicate colour is now unrepresentable rather than merely refused,
 * which is why `SETUP_ERRORS.duplicateToken` and the lobby's "That token is
 * taken" are gone rather than rewritten.
 *
 * The ids are persisted on `PlayerState.colorId`, so they are part of the save
 * format: changing one needs a migration, the same as any other shape change.
 *
 * Vivid and clearly distinguishable on purpose. A board piece is 9-18px, and
 * colour is the whole of what identifies it - there is no shape to fall back
 * on, and `themes.guard.test.ts` holds the "no two the same" line.
 */
export const PLAYER_COLORS: PlayerColor[] = [
  { id: 'red', color: '#e01b1b' },
  { id: 'blue', color: '#1466ff' },
  { id: 'yellow', color: '#ffd400' },
  { id: 'green', color: '#00b352' },
  { id: 'orange', color: '#ff7a00' },
  { id: 'purple', color: '#a020f0' },
  { id: 'teal', color: '#00c8c8' },
  { id: 'pink', color: '#ff4fa3' },
];

/**
 * The colour for the nth player created.
 *
 * Wraps rather than throwing, so a table larger than the palette degrades to a
 * repeated colour instead of a crash. `MAX_PLAYERS` is 8 and so is the list, so
 * the wrap is unreachable today - it is here because the alternative to a
 * defined answer is an `undefined` that reaches a `backgroundColor`.
 */
export const playerColorForIndex = (index: number): PlayerColor =>
  PLAYER_COLORS[index % PLAYER_COLORS.length];

/**
 * The colour with this id, or undefined.
 *
 * Undefined is reachable from disk: a save whose migration was skipped, or one
 * hand-edited. Every caller falls back rather than rendering an empty string
 * into a colour - see `colorFor` in gameView.selectors.
 */
export const playerColorById = (colorId: string): PlayerColor | undefined =>
  PLAYER_COLORS.find((entry) => entry.id === colorId);

/**
 * The hex a stored colour id resolves to.
 *
 * Falls back to the first colour rather than to `''`. An unknown id means a
 * corrupt save - the migration guarantees a valid one and the schema requires a
 * string - and of the two ways to be wrong, two players sharing a colour is
 * merely confusing while an empty string is `backgroundColor: ''`, a piece you
 * cannot see at all. That exact invisibility is the bug docs/features/setup.md
 * records from the days when a token id could come from another edition.
 */
export const colorForId = (colorId: string): string =>
  (playerColorById(colorId) ?? PLAYER_COLORS[0]).color;

/** The palette has to seat a full table. Asserted in themes.guard.test.ts. */
export const PALETTE_FLOOR = MAX_PLAYERS;
