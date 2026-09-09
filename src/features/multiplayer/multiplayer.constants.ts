/**
 * What the table says when something is wrong.
 *
 * One place, because the banner and the refusal must read the same sentence -
 * the rule every `*BlockedReason` follows. These were literals inside
 * `openOnlineTable`, and the rejoin path and the join screen need the same
 * words.
 *
 * Three of them were dead for a while, because `multiplayer.thunks` had grown
 * its own near-copies and `JoinPage` a third set with reassuring tails bolted
 * on: four spellings of "we cannot find that game", one of them differing from
 * another by a single noun. The tails were the best of the wordings, so they
 * are here now and everything reads from this.
 */
export const TABLE_MESSAGES = {
  noSuchCode: 'No game with that code. Check it and try again.',
  unreachable: 'Could not reach the game server. Try again in a moment.',
  offlineBuild: 'This copy of the game cannot play online.',
  codeLost: 'This device does not have the code for that table, so it cannot rejoin.',
  tableGone: 'That table is no longer there.',
  tableFull: 'That table is full.',
} as const;
