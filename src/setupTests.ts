import '@testing-library/jest-dom';

/**
 * Storage is shared by every test in a file, and the app writes saved games to
 * it, so one test's game could be found by the next. jsdom is per file, so this
 * only ever mattered within a file - but that is exactly where persistence
 * tests live.
 *
 * Deliberately not paired with vi.restoreAllMocks(): several suites install
 * spies they never restore, and restoring them here would change their
 * behaviour rather than fix it.
 */
beforeEach(() => {
  localStorage.clear();
});
