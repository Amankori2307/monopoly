import { Link } from 'react-router-dom';
import { RulesBoard } from '../../components/rules/RulesBoard';
import { RulesBoardExtra } from '../../components/rules/RulesBoardExtra';
import { RulesBuildings } from '../../components/rules/RulesBuildings';
import { RulesClosing } from '../../components/rules/RulesClosing';
import { RulesFaq } from '../../components/rules/RulesFaq';
import { RulesIntro } from '../../components/rules/RulesIntro';
import { RULES_SECTIONS } from '../../components/rules/rulesSections.constants';
import { RulesJail } from '../../components/rules/RulesJail';
import { RulesMoney } from '../../components/rules/RulesMoney';
import { RulesSpeedDie } from '../../components/rules/RulesSpeedDie';
import { RulesStart } from '../../components/rules/RulesStart';
import { RulesTurn } from '../../components/rules/RulesTurn';
import { defaultTheme } from '../../domain/themes/themes.registry';
import { AppShell } from '../shell/AppShell';
import { RulesEditionProvider } from '../../components/rules/RulesEditionContext';
import { useHashScroll } from './hooks/useHashScroll';
import { useRulesEdition } from './useRulesEdition';

export function RulesPage() {
  useHashScroll();
  // The edition you are playing, or the generic reading when you are not.
  const edition = useRulesEdition();

  return (
    <AppShell editionId={defaultTheme.id}>
      <main className="rules-page">
        <header className="rules-header">
          <div>
            <p className="eyebrow">{edition.name}</p>
            <h1>Rules of play</h1>
            <p className="rules-lede">
              A digital reading guide to the board, the money and the turn.
            </p>
          </div>
        </header>

        {/* Nav, sections, and the matching headings in
            docs/india-edition-rules.md all come from RULES_SECTIONS, so they
            cannot drift apart. rulesSync.test.ts enforces it.

            These are Links, not bare `<a href="#faq">` anchors. Under
            HashRouter the whole route lives after the `#`, so a bare anchor
            would replace the route with `/faq` - no such route - and blank the
            page instead of scrolling. `to="/rules#faq"` renders as
            `#/rules#faq`, which stays on this route, survives a copy-paste and
            a reload, and is scrolled to by useHashScroll. */}
        <nav className="rules-nav" aria-label="Rules sections">
          {RULES_SECTIONS.map((section) => (
            <Link to={`/rules#${section.id}`} key={section.id}>
              {section.label}
            </Link>
          ))}
        </nav>

        <RulesEditionProvider edition={edition}>
          <article className="rules-booklet">
            <RulesIntro />
            <RulesFaq />
            <RulesStart />
            <RulesTurn />
            <RulesBoard />
            <RulesBoardExtra />
            <RulesJail />
            <RulesBuildings />
            <RulesMoney />
            <RulesSpeedDie />
            <RulesClosing />
          </article>
        </RulesEditionProvider>
      </main>
    </AppShell>
  );
}
