import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { RulesPage } from './RulesPage';

/** Section ids the in-page nav links to. */
const NAV_TARGETS = ['start', 'turn', 'board', 'jail', 'buildings', 'money', 'speed-die'];

describe('RulesPage', () => {
  it('renders the booklet heading and back link', () => {
    renderWithProviders(<RulesPage />);

    expect(screen.getByRole('heading', { name: /Rules of play/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to games/i })).toBeInTheDocument();
  });

  // The sections were extracted into separate components; every nav link must
  // still resolve to a section that actually renders.
  it('renders a section for every nav link', () => {
    const { container } = renderWithProviders(<RulesPage />);

    for (const id of NAV_TARGETS) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('links each nav item to its section anchor', () => {
    renderWithProviders(<RulesPage />);

    const nav = screen.getByRole('navigation', { name: /Rules sections/i });
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) =>
      a.getAttribute('href')
    );

    expect(hrefs).toEqual(NAV_TARGETS.map((id) => `#${id}`));
  });
});
