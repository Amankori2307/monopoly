/**
 * A write to browser storage that the browser refused.
 *
 * localStorage throws on a full quota, and in some private-browsing modes on
 * any write at all. A distinct type so a caller can tell "we could not save"
 * apart from a genuine bug, and say so rather than crashing the turn.
 */
export class StorageWriteError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'StorageWriteError';
    this.cause = cause;
  }
}
