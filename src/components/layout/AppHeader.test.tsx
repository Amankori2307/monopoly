import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS } from '../../shared/constants/nav.constants';
import { AppHeader } from './AppHeader';

const renderHeader = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppHeader
        appearance="edition"
        appearanceLabel="Match the edition"
        onAppearanceChange={vi.fn()}
        onSoundChange={vi.fn()}
        soundEnabled
      />
    </MemoryRouter>
  );

describe('AppHeader', () => {
  it('is a banner with a named nav, so both are findable landmarks', () => {
    renderHeader('/');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('offers every place in the nav list', () => {
    renderHeader('/');

    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
    }
  });

  // Marked with aria-current, not by colour alone.
  it('marks the rules as current on the rules route', () => {
    renderHeader('/rules');

    expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Play' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  /**
   * `end` on the home link, or it is current everywhere: `/` is a prefix of
   * every route, so without it the front door reads as the current place while
   * you are in a game.
   */
  it('does not mark Play as current inside a game', () => {
    renderHeader('/game/game-1');

    expect(screen.getByRole('link', { name: 'Play' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('marks Play as current on the front door itself', () => {
    renderHeader('/');

    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});
