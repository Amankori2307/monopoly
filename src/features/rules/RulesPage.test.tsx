import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RULES_SECTIONS } from '../../components/rules/rulesSections.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { RulesPage } from './RulesPage';

// From the shared list, not a copy: the nav, the rendered sections, and the
// matching doc headings all come from RULES_SECTIONS. See rulesSync.test.ts.
const NAV_TARGETS = RULES_SECTIONS.map((section) => section.id);

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

  // The nav links carry the route as well as the anchor. A bare `#faq` would
  // be the whole URL under the app's HashRouter, so clicking one navigated to
  // `/faq`, matched no route, and blanked the page.
  //
  // These are the MemoryRouter hrefs, which is what this harness renders. The
  // shape the browser actually gets - `#/rules#faq` - is asserted in
  // tests/e2e/rules.spec.ts, against the real router.
  it('links each nav item to its section on this route', () => {
    renderWithProviders(<RulesPage />);

    const nav = screen.getByRole('navigation', { name: /Rules sections/i });
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) =>
      a.getAttribute('href')
    );

    expect(hrefs).toEqual(NAV_TARGETS.map((id) => `/rules#${id}`));
  });

  // Added because the questions it answers were the ones being asked in play.
  it('answers the frequently asked questions', () => {
    renderWithProviders(<RulesPage />);

    const faq = screen.getByRole('heading', { name: /questions that come up/i });
    expect(faq).toBeInTheDocument();
    expect(
      screen.getByText(/Do I roll again\?/i, { selector: 'dt' })
    ).toBeInTheDocument();
  });

  // The two answers people get wrong, stated on the page itself.
  it('states that going to Jail on a double ends the turn', () => {
    const { container } = renderWithProviders(<RulesPage />);

    expect(container.querySelector('#faq')?.textContent).toMatch(
      /your turn ends immediately/i
    );
  });

  it('states that Jail is one roll per turn, not three', () => {
    const { container } = renderWithProviders(<RulesPage />);

    expect(container.querySelector('#faq')?.textContent).toMatch(/One per turn/i);
  });

  it('states that you cannot auction property you own', () => {
    const { container } = renderWithProviders(<RulesPage />);

    expect(container.querySelector('#faq')?.textContent).toMatch(
      /cannot auction property you own/i
    );
  });
});
