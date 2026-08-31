import { useEffect } from 'react';
import type { Toast } from './overlays.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';

interface ToastStackProps {
  /** How long each toast stays up, in ms. */
  dismissAfterMs: number;
  onDismiss: (toastId: string) => void;
  toasts: Toast[];
}

/**
 * Action feedback, stacked above everything else.
 *
 * A polite live region rather than an alert: these report what just happened
 * and must not interrupt a screen reader mid-sentence. Anything the player has
 * to answer is a decision modal, not a toast.
 */
export function ToastStack({ dismissAfterMs, onDismiss, toasts }: ToastStackProps) {
  return (
    <div aria-live="polite" className="toast-stack" role="status">
      {toasts.map((toast) => (
        <ToastRow
          dismissAfterMs={dismissAfterMs}
          key={toast.id}
          onDismiss={onDismiss}
          toast={toast}
        />
      ))}
    </div>
  );
}

interface ToastRowProps {
  dismissAfterMs: number;
  onDismiss: (toastId: string) => void;
  toast: Toast;
}

function ToastRow({ dismissAfterMs, onDismiss, toast }: ToastRowProps) {
  // Per-row timer rather than one sweep, so each toast lives its full span even
  // when a burst of events arrives mid-turn.
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), dismissAfterMs);
    return () => window.clearTimeout(timer);
  }, [dismissAfterMs, onDismiss, toast.id]);

  return (
    <button
      className={`toast toast-${toast.tone}`}
      data-testid={scopedTestId(TEST_IDS.toast, toast.id)}
      onClick={() => onDismiss(toast.id)}
      type="button"
    >
      {toast.message}
    </button>
  );
}
