/** Rules booklet section. Static copy - see docs/features/rules-page.md. */
export function RulesIntro() {
  return (
    <section className="rules-intro">
      <p className="eyebrow">A short history</p>
      <h2>From property trading to the India Edition</h2>
      <p>
        According to Hasbro&apos;s published history, Charles B. Darrow presented MONOPOLY
        to Parker Brothers in 1934; Parker Brothers began selling the property-trading
        game in 1935. This edition keeps the familiar game structure but uses Indian
        cities, railway stations, rupee-style money, and India Edition values.
      </p>
      <p className="source-note">
        History source:{' '}
        <a href="https://www.hasbro.com/common/instruct/monins.pdf">
          Hasbro&apos;s official Monopoly rules and history
        </a>
        . India Edition gameplay details below come from the booklet and board supplied
        for this project.
      </p>
    </section>
  );
}
