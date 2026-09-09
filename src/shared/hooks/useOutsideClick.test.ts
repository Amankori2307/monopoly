import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOutsideClick } from './useOutsideClick';

/** A real element in the document, so composedPath() has something to report. */
const mount = () => {
  const inside = document.createElement('div');
  const child = document.createElement('button');
  inside.appendChild(child);
  const outside = document.createElement('div');
  document.body.append(inside, outside);
  return { inside, child, outside };
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useOutsideClick', () => {
  it('calls the handler for a press outside while active', () => {
    const { inside, outside } = mount();
    const onOutside = vi.fn();
    renderHook(() => useOutsideClick({ current: inside }, true, onOutside));

    fireEvent.pointerDown(outside);

    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('ignores a press inside', () => {
    const { inside } = mount();
    const onOutside = vi.fn();
    renderHook(() => useOutsideClick({ current: inside }, true, onOutside));

    fireEvent.pointerDown(inside);

    expect(onOutside).not.toHaveBeenCalled();
  });

  // The case composedPath() is here for: a press on a menu item, which is
  // inside even though it is not the element itself.
  it('ignores a press on a descendant', () => {
    const { inside, child } = mount();
    const onOutside = vi.fn();
    renderHook(() => useOutsideClick({ current: inside }, true, onOutside));

    fireEvent.pointerDown(child);

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('does nothing while inactive', () => {
    const { inside, outside } = mount();
    const onOutside = vi.fn();
    renderHook(() => useOutsideClick({ current: inside }, false, onOutside));

    fireEvent.pointerDown(outside);

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('does nothing when there is no element yet', () => {
    const { outside } = mount();
    const onOutside = vi.fn();
    renderHook(() => useOutsideClick({ current: null }, true, onOutside));

    fireEvent.pointerDown(outside);

    // A null ref means nothing is open to dismiss, so a press is not a dismiss.
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', () => {
    const { inside, outside } = mount();
    const onOutside = vi.fn();
    const { unmount } = renderHook(() =>
      useOutsideClick({ current: inside }, true, onOutside)
    );

    unmount();
    fireEvent.pointerDown(outside);

    expect(onOutside).not.toHaveBeenCalled();
  });
});
