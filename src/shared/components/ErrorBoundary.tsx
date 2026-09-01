import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TEST_IDS } from '../constants/testIds.constants';
import { describeError, logger } from '../utils/logger.utils';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  message: string | null;
}

/**
 * The last line of defence: a render that throws would otherwise white-screen
 * the app with no way back and nothing in the log.
 *
 * It matters most for a saved game. The zod schema is what should catch a
 * corrupt save at the boundary, but a save that satisfies the schema and still
 * breaks a component - a space id pointing at nothing, an ownership entry for a
 * player who has gone - would take the whole page down. This turns that into a
 * message and a way out.
 *
 * A class component because that is the only way to catch a render error in
 * React; nothing else in this codebase is one.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: describeError(error).message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    logger.error('render', 'a component threw while rendering', {
      ...describeError(error),
      componentStack: info.componentStack,
    });
  }

  render() {
    const { message } = this.state;
    if (message === null) {
      return this.props.children;
    }

    return (
      <div className="app-shell">
        <div className="page">
          <section className="panel error-panel" data-testid={TEST_IDS.errorBoundary}>
            <p className="eyebrow">Something broke</p>
            <h1>This game could not be shown</h1>
            <p className="error-panel-message">{message}</p>
            <p className="error-panel-help">
              The details are in the log. Your saved games are untouched — going back to
              the list and opening one again is usually enough.
            </p>
            <div className="button-row">
              {/* A full reload, not a router link: whatever threw is still in
                  the component tree, and navigating within it would re-render
                  straight back into the same error. */}
              <a className="primary-button" href="/">
                Back to games
              </a>
            </div>
          </section>
        </div>
      </div>
    );
  }
}
