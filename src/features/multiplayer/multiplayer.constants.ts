/**
 * What the table says when something is wrong.
 *
 * One place, because the banner and the refusal must read the same sentence -
 * the rule every `*BlockedReason` follows. These were literals inside
 * `openOnlineTable`, and the rejoin path and the join screen need the same
 * words.
 */
export const TABLE_MESSAGES = {
  noSuchCode: 'No game with that code.',
  unreachable: 'Could not reach the game server.',
  offlineBuild: 'This copy of the game cannot play online.',
  codeLost: 'The code for this table is not on this device, so it cannot be rejoined.',
  tableGone: 'That table is no longer there.',
} as const;
