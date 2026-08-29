import { useEffect } from 'react';

/**
 * Calls `onEscape` while `isActive`. Used by dismissible overlays so each one
 * does not re-implement the listener and its cleanup.
 */
export const useEscapeKey = (isActive: boolean, onEscape: () => void) => {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);
};
