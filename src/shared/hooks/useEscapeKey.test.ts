import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEscapeKey } from './useEscapeKey';

describe('useEscapeKey', () => {
  it('calls the handler when Escape is pressed while active', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('does nothing while inactive', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(false, onEscape));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onEscape).not.toHaveBeenCalled();
  });

  // A listener left behind would keep firing after the overlay closed.
  it('removes the listener on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(true, onEscape));

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onEscape).not.toHaveBeenCalled();
  });
});
