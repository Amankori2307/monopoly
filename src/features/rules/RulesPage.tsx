import { Link } from 'react-router-dom';
import { RulesBoard } from '../../components/rules/RulesBoard';
import { RulesBoardExtra } from '../../components/rules/RulesBoardExtra';
import { RulesBuildings } from '../../components/rules/RulesBuildings';
import { RulesClosing } from '../../components/rules/RulesClosing';
import { RulesIntro } from '../../components/rules/RulesIntro';
import { RulesJail } from '../../components/rules/RulesJail';
import { RulesMoney } from '../../components/rules/RulesMoney';
import { RulesSpeedDie } from '../../components/rules/RulesSpeedDie';
import { RulesStart } from '../../components/rules/RulesStart';
import { RulesTurn } from '../../components/rules/RulesTurn';

const sectionLinks = [
  ['Start', '#start'],
  ['Turn', '#turn'],
  ['Board', '#board'],
  ['Jail', '#jail'],
  ['Buildings', '#buildings'],
  ['Money', '#money'],
  ['Speed Die', '#speed-die'],
];

export function RulesPage() {
  return (
    <div className="app-shell rules-shell">
      <main className="rules-page">
        <header className="rules-header">
          <div>
            <p className="eyebrow">Monopoly India Edition</p>
            <h1>Rules of play</h1>
            <p className="rules-lede">
              A digital reading guide based on the India Edition booklet and board.
            </p>
          </div>
          <Link className="secondary-button" to="/">
            Back to games
          </Link>
        </header>

        <nav className="rules-nav" aria-label="Rules sections">
          {sectionLinks.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>

        <article className="rules-booklet">
          <RulesIntro />
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
      </main>
    </div>
  );
}
