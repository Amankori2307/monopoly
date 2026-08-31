import type { LogLevel } from './logger.enums';

/** One captured log entry, as held in the ring buffer. */
export interface LogEntry {
  at: string;
  level: LogLevel;
  scope: string;
  message: string;
  context?: Record<string, unknown>;
}
