import type { ReactNode } from 'react';

/**
 * The style guide's specimen rows.
 *
 * Presentational, and in `components/` rather than beside the page because
 * that is where the layer rules put anything with no store access - the page
 * itself has to live in `features/` only because it renders `AppShell`.
 */

export function StyleSection({
  children,
  note,
  title,
}: {
  children: ReactNode;
  note: string;
  title: string;
}) {
  return (
    <section className="panel style-section">
      <h2>{title}</h2>
      <p className="helper-text">{note}</p>
      {children}
    </section>
  );
}

/** One line of specimen text per type role, each set in that role. */
export function TypeSpecimens({ roles }: { roles: readonly string[] }) {
  return (
    <ul className="style-type">
      {roles.map((role) => (
        <li key={role}>
          <span className="style-key">{role}</span>
          <span className={`style-specimen is-${role}`}>Buy, build, bankrupt</span>
        </li>
      ))}
    </ul>
  );
}

/** A bar per rung, so the grid is something you can see rather than read. */
export function SpaceRungs({ steps }: { steps: readonly number[] }) {
  return (
    <ul className="style-space">
      {steps.map((step) => (
        <li key={step}>
          <span className="style-key">{step}</span>
          <span className={`style-bar is-space-${step}`} />
          <span className="style-value">{step * 4}px</span>
        </li>
      ))}
    </ul>
  );
}

/** A named row with a note, for the layer stack and the motion durations. */
export function StyleRows({
  className,
  ordered = false,
  rows,
}: {
  className: string;
  ordered?: boolean;
  rows: readonly { name: string; note?: string }[];
}) {
  const items = rows.map((row) => (
    <li key={row.name}>
      <span className="style-key">{row.name}</span>
      {row.note ? <span className="style-value">{row.note}</span> : null}
      {className === 'style-motion' ? (
        <span className={`style-dot is-${row.name}`} />
      ) : null}
    </li>
  ));
  return ordered ? (
    <ol className={className}>{items}</ol>
  ) : (
    <ul className={className}>{items}</ul>
  );
}

/** The elevation ladder, each level painted on a tile. */
export function ElevationTiles({
  levels,
}: {
  levels: readonly { name: string; note: string }[];
}) {
  return (
    <ul className="style-elevations">
      {levels.map((level) => (
        <li key={level.name}>
          <span className={`style-tile is-${level.name}`} />
          <span className="style-key">{level.name}</span>
          <span className="style-value">{level.note}</span>
        </li>
      ))}
    </ul>
  );
}
