import type { DeckCard, ThemeToken } from '../types/game.interfaces';

/**
 * One theme, whole.
 *
 * The point of this shape is that adding a theme is adding **one file**:
 * everything that makes the game look and read like that edition is here, and
 * nothing about it is scattered through the board, the cards and an icon
 * registry the way the India edition used to be.
 *
 * What is deliberately **not** here is the economics - prices, rents, mortgage
 * values, what each square does. Those are the ruleset, shared by every
 * standard edition, and they live in `boardLayout.constants`. That is not a
 * simplification: Old Kent Road, Mediterranean Avenue and Guwahati are all the
 * cheapest brown at 60 renting 2, in every licensed edition. A theme names the
 * board; it does not re-price it. Which is what keeps a new theme to a list of
 * forty names, and what stops two themes drifting into two subtly different
 * games that both claim to be Monopoly.
 *
 * The **palette** is not here yet either. Colours still live in
 * `styles/themes/_themes.scss`, keyed by this `id`, so a new theme is this file
 * plus one SCSS block. Moving them in here is the next phase.
 */
/**
 * What this edition calls the things on its board.
 *
 * The printed rules are identical in every edition - only the names, the money
 * and the *words* differ. India has cities and railway stations, the US has
 * streets and railroads, London has streets and stations, and the world board
 * flies between airports. The booklet is one set of prose that reads these, so
 * a rule can never be right in one edition and wrong in another.
 *
 * Lower case: the booklet interpolates them mid-sentence.
 */
export interface ThemeNouns {
  /** A single ordinary property square. */
  site: string;
  sites: string;
  /** One of the four squares in the railway slots. */
  railway: string;
  railways: string;
}

export interface GameTheme {
  /** Also the `data-theme` attribute, so the SCSS palette keys off it. */
  id: string;
  /** Shown in the ruleset picker and as the home page's masthead. */
  name: string;
  /** Prefixes every amount on screen, and in the card text built from it. */
  currencySymbol: string;
  /**
   * The playing pieces.
   *
   * Colour is load-bearing rather than decorative: the board tokens are plain
   * coloured discs, so it is the only thing telling two players apart.
   */
  tokenCatalog: ThemeToken[];
  /** What this edition calls a site and a railway. See ThemeNouns. */
  nouns: ThemeNouns;
  /**
   * The forty squares, in board order.
   *
   * Index-aligned with `BOARD_LAYOUT`, so entry 39 names whatever the layout
   * says index 39 is. The guard test checks the length and that every name is
   * distinct - two squares sharing a name is unplayable, because the deed panel
   * and the history both identify a square by what it is called.
   */
  spaceNames: readonly string[];
  /**
   * What is printed across the middle of the board.
   *
   * Theme content rather than a constant: it was `BOARD_CENTER_SUBTITLE =
   * 'India Edition'` in game.constants, so a London board rendered with "INDIA
   * EDITION" across the middle of it. Caught by looking at the thing.
   */
  boardCenter: { title: string; subtitle: string };
  /**
   * Chance and Community Chest, when this theme wants its own.
   *
   * Omitted by both editions here, because the standard sixteen are built from
   * this theme's own currency and square names and come out right on their own.
   * A theme with a story of its own - a Harry Potter board, say - would supply
   * them rather than accept "Advance to Mayfair".
   */
  cards?: { chance: DeckCard[]; communityChest: DeckCard[] };
}
