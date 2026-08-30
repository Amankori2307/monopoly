import type { ReactNode } from 'react';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { useEscapeKey } from '../../../shared/hooks/useEscapeKey';

interface SideDrawerProps {
  children: ReactNode;
  eyebrow: string;
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  title: string;
  /** Wider panel, for content that needs the room - e.g. full title deeds. */
  wide?: boolean;
}

/**
 * Right-hand drawer shell shared by the activity log and player details.
 * Dismissible three ways: backdrop click, close button, or Escape.
 */
export function SideDrawer({
  children,
  eyebrow,
  isOpen,
  onClose,
  testId,
  title,
  wide = false,
}: SideDrawerProps) {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <aside
        aria-labelledby={`${testId}-title`}
        aria-modal="true"
        className={`side-drawer ${wide ? 'is-wide' : ''}`}
        data-testid={testId}
        role="dialog"
      >
        <header className="side-drawer-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={`${testId}-title`}>{title}</h2>
          </div>
          <button
            aria-label="Close"
            className="space-detail-close"
            data-testid={TEST_IDS.drawerClose}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>
        <div className="side-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
