/**
 * Lightweight app logger.
 *
 * Exists because the engine throws on invalid commands and a swallowed throw is
 * very hard to diagnose after the fact. Entries go to the console, to a capped
 * in-memory ring, and to localStorage so they survive a reload — the state you
 * actually want when someone says "it got stuck".
 *
 * In the browser the ring is exposed as `window.monopolyLog` for inspection:
 *   monopolyLog.entries()          // everything captured
 *   monopolyLog.errors()           // failures only
 *   monopolyLog.download()         // copy/paste-able JSON
 */

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface LogEntry {
  at: string;
  level: LogLevel;
  scope: string;
  message: string;
  context?: Record<string, unknown>;
}

export const LOG_STORAGE_KEY = 'monopoly.log.v1';
export const MAX_LOG_ENTRIES = 200;

let entries: LogEntry[] = [];

const persist = () => {
  try {
    window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be full or blocked; logging must never break the app.
  }
};

const consoleFor = (level: LogLevel) => {
  if (level === LogLevel.Error) return console.error;
  if (level === LogLevel.Warn) return console.warn;
  return console.info;
};

export const log = (
  level: LogLevel,
  scope: string,
  message: string,
  context?: Record<string, unknown>
): LogEntry => {
  const entry: LogEntry = {
    at: new Date().toISOString(),
    level,
    scope,
    message,
    ...(context ? { context } : {}),
  };

  entries = [...entries, entry].slice(-MAX_LOG_ENTRIES);
  persist();
  consoleFor(level)(`[${scope}] ${message}`, context ?? '');

  return entry;
};

export const logger = {
  debug: (scope: string, message: string, context?: Record<string, unknown>) =>
    log(LogLevel.Debug, scope, message, context),
  info: (scope: string, message: string, context?: Record<string, unknown>) =>
    log(LogLevel.Info, scope, message, context),
  warn: (scope: string, message: string, context?: Record<string, unknown>) =>
    log(LogLevel.Warn, scope, message, context),
  error: (scope: string, message: string, context?: Record<string, unknown>) =>
    log(LogLevel.Error, scope, message, context),
};

export const getLogEntries = (): LogEntry[] => [...entries];

export const getLogErrors = (): LogEntry[] =>
  entries.filter((entry) => entry.level === LogLevel.Error);

export const clearLog = () => {
  entries = [];
  persist();
};

/** Normalises anything thrown into a message plus a stack when there is one. */
export const describeError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return { message: error.message, ...(error.stack ? { stack: error.stack } : {}) };
  }
  return { message: String(error) };
};

/** Attaches the inspection handle. Called once at startup. */
export const exposeLoggerForDebugging = () => {
  if (typeof window === 'undefined') {
    return;
  }
  (window as unknown as Record<string, unknown>).monopolyLog = {
    entries: getLogEntries,
    errors: getLogErrors,
    clear: clearLog,
    download: () => JSON.stringify(getLogEntries(), null, 2),
  };
};
