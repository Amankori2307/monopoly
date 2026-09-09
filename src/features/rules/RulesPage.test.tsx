import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GENERIC_NOUNS } from '../../domain/themes/nouns.constants';
import { RULES_SECTIONS } from '../../components/rules/rulesSections.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { RulesPage } from './RulesPage';

// From the shared list, not a copy: the nav, the rendered sections, and the
// matching doc headings all come from RULES_SECTIONS. See rulesSync.test.ts.
const NAV_TARGETS = RULES_SECTIONS.map((section) => section.id);

describe('RulesPage', () => {
  it('renders the booklet heading, and the header carries the way back', () => {
    renderWithProviders(<RulesPage />);

    expect(screen.getByRole('heading', { name: /Rules of play/i })).toBeInTheDocument();
    // The booklet's own "Back to games" button is gone: the header is on every
    // screen now and carries the nav, so a second way home beside it was
    // duplication rather than convenience.
    expect(
      screen.getByRole('navigation', { name: 'Main' }).querySelector('a')
    ).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Play' })).toBeInTheDocument();
  });

  /**
   * Three run-together words shipped in the booklet - "The same applies
   * tostation", "Pay the Bank 200 / 100respectively", "If you fail on your
   * third turn, pay50" - all from a JSX interpolation sitting on its own line,
   * which eats the newline that was standing in for the space. It reads as a
   * typo and it is invisible in review, because the source looks right.
   *
   * Checked per element, over that element's OWN text nodes only. The whole
   * container's textContent glues adjacent blocks together - two table cells
   * become "stationRent rises", a dd and the next h2 become "502. Take your
   * turn" - so it reports the bug everywhere and is useless. An interpolation
   * and the words around it are always siblings inside one element, which is
   * exactly what this joins.
   */
  const ownText = (element: Element): string =>
    Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('');

  const bookletTexts = (): string[] => {
    const { container } = renderWithProviders(<RulesPage />);
    return Array.from(container.querySelectorAll('*')).map(ownText);
  };

  it('never runs a word into an interpolated one', () => {
    // The nouns are the checkable case: every one arrives from the theme
    // through an interpolation, so a letter immediately either side of one is
    // always this bug.
    const nouns = Object.values(GENERIC_NOUNS);
    const texts = bookletTexts();

    nouns.forEach((noun) => {
      // "stations" legitimately extends "station", so a noun that is the start
      // of another noun cannot be checked on its trailing edge.
      const extended = nouns.some((other) => other !== noun && other.startsWith(noun));
      texts.forEach((text) => {
        expect(text).not.toMatch(new RegExp(`[a-z]${noun}\\b`));
        if (!extended) {
          expect(text).not.toMatch(new RegExp(`\\b${noun}[a-z]`));
        }
      });
    });
  });

  it('never runs a word into an interpolated amount', () => {
    bookletTexts().forEach((text) => {
      expect(text).not.toMatch(/[a-z]\d/);
      // A digit may only be followed by an ordinal suffix or a multiplier.
      expect(text.replace(/\d(?:st|nd|rd|th|x|×)/g, '')).not.toMatch(/\d[a-z]/);
    });
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
