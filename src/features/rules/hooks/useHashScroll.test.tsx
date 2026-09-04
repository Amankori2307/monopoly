import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHashScroll } from './useHashScroll';

/**
 * Under HashRouter the browser stops doing anchor scrolling for us, because
 * the whole route lives after the `#`. This hook is what replaces it.
 */

const withRoute = (entry: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  );
  return renderHook(() => useHashScroll(), { wrapper });
};

/** Puts a real element with `id` in the document and reports its scrolls. */
const plantSection = (id: string) => {
  const element = document.createElement('section');
  element.id = id;
  const scrollIntoView = vi.fn();
  element.scrollIntoView = scrollIntoView;
  document.body.append(element);
  return scrollIntoView;
};

describe('useHashScroll', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls to the section named by the hash', () => {
    const scrollIntoView = plantSection('faq');

    withRoute('/rules#faq');

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('leaves the page alone when the route carries no hash', () => {
    const scrollIntoView = plantSection('faq');

    withRoute('/rules');

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not throw on a hash naming a section that does not exist', () => {
    // Not reachable from our own nav - rulesSync.test.ts rules that out - but
    // it is one typed URL away, and a crash there would be an error boundary.
    expect(() => withRoute('/rules#not-a-section')).not.toThrow();
  });

  it('scrolls again when the hash changes without a remount', async () => {
    const faq = plantSection('faq');
    const jail = plantSection('jail');

    // Clicking a second nav link is a hash change with no remount, so an
    // effect keyed on mount alone would leave the reader where they were.
    const Booklet = () => {
      useHashScroll();
      const navigate = useNavigate();
      return (
        <button onClick={() => navigate('/rules#jail')} type="button">
          Go to jail section
        </button>
      );
    };

    render(
      <MemoryRouter initialEntries={['/rules#faq']}>
        <Booklet />
      </MemoryRouter>
    );
    expect(faq).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button'));

    expect(jail).toHaveBeenCalledTimes(1);
  });
});
