import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface CommandErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
  /**
   * What kind of problem this is. Defaults to a refused command.
   *
   * A second banner would have been the obvious way to report a connection
   * problem, and the wrong one: it would fight this one for the strip above the
   * decision backdrop, which is the only place either is visible while a modal
   * is up. One banner with an honest heading instead - "Action not allowed" is
   * simply untrue of "reconnecting".
   */
  title?: string;
  /** A connection problem clears itself, so there is nothing to dismiss. */
  isDismissible?: boolean;
}

/**
 * Shows a rejected command instead of failing silently. The engine throws on an
 * invalid command; the thunk catches it, and this is where the player finds out
 * why nothing happened.
 */
export function CommandErrorBanner({
  message,
  onDismiss,
  title = 'Action not allowed',
  isDismissible = true,
}: CommandErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <section className="command-error" data-testid={TEST_IDS.commandError} role="alert">
      <div>
        <p className="eyebrow">{title}</p>
        <p className="command-error-message">{message}</p>
      </div>
      {isDismissible ? (
        <button
          aria-label="Dismiss error"
          className="command-error-dismiss"
          onClick={onDismiss}
          type="button"
        >
          x
        </button>
      ) : null}
    </section>
  );
}
