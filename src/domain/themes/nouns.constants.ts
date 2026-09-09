import type { ThemeNouns } from './theme.interfaces';

/**
 * The vocabulary to use when no edition is in scope.
 *
 * The rules booklet is reachable from the header on every route, so it is often
 * read with no game open at all. It used to hardcode India's words - cities,
 * railway stations, rupees - which is wrong for three of the four editions and
 * arbitrary for a reader who has not chosen one yet.
 *
 * These are the words that are true of every edition: what the rules are
 * actually about, before a board gives them local colour.
 */
export const GENERIC_NOUNS: ThemeNouns = {
  site: 'property',
  sites: 'properties',
  railway: 'station',
  railways: 'stations',
};
