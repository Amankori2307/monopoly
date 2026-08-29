import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface CommandErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
}

/**
 * Shows a rejected command instead of failing silently. The engine throws on an
 * invalid command; the thunk catches it, and this is where the player finds out
 * why nothing happened.
 */
export function CommandErrorBanner({ message, onDismiss }: CommandErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <section className="command-error" data-testid={TEST_IDS.commandError} role="alert">
      <div>
        <p className="eyebrow">Action not allowed</p>
        <p className="command-error-message">{message}</p>
      </div>
      <button
        aria-label="Dismiss error"
        className="command-error-dismiss"
        onClick={onDismiss}
        type="button"
      >
        x
      </button>
    </section>
  );
}
