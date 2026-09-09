import { useRulesEdition } from './RulesEditionContext';

/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesIntro() {
  const { name, nouns } = useRulesEdition();

  return (
    <section className="rules-intro">
      <p className="eyebrow">A short history</p>
      <h2>From property trading to the board you are playing</h2>
      <p>
        According to Hasbro&apos;s published history, Charles B. Darrow presented MONOPOLY
        to Parker Brothers in 1934; Parker Brothers began selling the property-trading
        game in 1935. Every edition keeps that structure and changes only the names and
        the money: {name} deals in {nouns.sites} and {nouns.railways}, and the rules below
        are the same whichever board is on the table.
      </p>
      <p className="source-note">
        History source:{' '}
        <a href="https://www.hasbro.com/common/instruct/monins.pdf">
          Hasbro&apos;s official Monopoly rules and history
        </a>
        . The values below come from the booklet and board supplied for this project.
      </p>
    </section>
  );
}
