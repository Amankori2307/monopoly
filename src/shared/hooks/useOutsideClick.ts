import { useEffect, type RefObject } from 'react';

/**
 * Calls `onOutside` when a pointer goes down anywhere outside `ref`, while
 * `isActive`.
 *
 * `pointerdown` rather than `click`, and this matters: a `click` listener fires
 * after the press has already moved focus and, on a control that toggles the
 * very thing being dismissed, the dismiss and the re-open land in the same
 * gesture - so the menu closes and immediately reopens. Going down on the
 * trigger is the trigger's business; going down anywhere else is a dismiss.
 *
 * Paired with `useEscapeKey`, which covers the keyboard half.
 */
export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  isActive: boolean,
  onOutside: () => void
) => {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const element = ref.current;
      // A press inside is not a dismiss. `composedPath` rather than `contains`
      // so a press that starts on a child which unmounts mid-gesture - a menu
      // item that closes the menu - is still recognised as inside.
      if (!element || event.composedPath().includes(element)) {
        return;
      }
      onOutside();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isActive, onOutside, ref]);
};
