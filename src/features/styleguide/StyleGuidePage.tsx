import {
  ElevationTiles,
  SpaceRungs,
  StyleRows,
  StyleSection,
  TypeSpecimens,
} from '../../components/styleguide/StyleSpecimens';
import { defaultTheme } from '../../domain/themes/themes.registry';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { AppShell } from '../shell/AppShell';
import {
  DURATIONS,
  ELEVATIONS,
  LAYERS,
  SPACE_STEPS,
  TEXT_ROLES,
} from './styleGuide.constants';
import { useThemeTokens } from './useThemeTokens';

/**
 * The design system, rendered.
 *
 * A maintainer's page, not a player's - deliberately absent from `NAV_ITEMS`,
 * which is the list of the app's top-level places for somebody playing, and
 * which already wrapped to a second line once when a control gained a text
 * label. Reachable at `#/style` and linked from docs/design-system.md.
 *
 * It exists because a system nobody can look at drifts. The guards can prove a
 * partial reaches for a token; they cannot say whether the ramp reads as a
 * ramp, or whether one elevation is distinguishable from the level below it.
 * Those are questions only a screen answers, and answering them used to mean
 * clicking through eight routes and hoping to notice.
 */
export function StyleGuidePage() {
  const swatches = useThemeTokens();

  return (
    <AppShell editionId={defaultTheme.id}>
      <div className="page style-page" data-testid={TEST_IDS.stylePage}>
        <header className="style-masthead">
          <p className="eyebrow">Design system</p>
          <h1>Every rung, on one screen</h1>
          <p className="masthead-lede">
            Every scale the app is allowed to reach for. Anything on a screen that is not
            here is a literal, and <code>designSystem.guard.test.ts</code> will say so.
          </p>
        </header>

        <StyleSection
          title="Type"
          note="A role carries size, leading, weight, tracking, family and case together."
        >
          <TypeSpecimens roles={TEXT_ROLES} />
        </StyleSection>

        <StyleSection
          title="Space"
          note="A 4px grid. The number is the multiple, so step 3 is 12px."
        >
          <SpaceRungs steps={SPACE_STEPS} />
        </StyleSection>

        <StyleSection
          title="Colour"
          note="Read live from the palette. Change the appearance and every swatch moves."
        >
          <ul className="style-swatches" data-testid={TEST_IDS.styleSwatches}>
            {swatches.map((swatch) => (
              <li key={swatch.name}>
                <span
                  className="style-swatch"
                  style={{ background: `var(${swatch.name})` }}
                />
                <span className="style-key">{swatch.name.replace('--', '')}</span>
              </li>
            ))}
          </ul>
        </StyleSection>

        <StyleSection
          title="Elevation"
          note="Geometry is fixed; the ink is a theme decision."
        >
          <ElevationTiles levels={ELEVATIONS} />
        </StyleSection>

        <StyleSection
          title="Controls"
          note="One base rule. Every variant derives from it, focus ring included."
        >
          <div className="style-controls">
            <button className="primary-button" type="button">
              Primary
            </button>
            <button className="secondary-button" type="button">
              Secondary
            </button>
            <button className="danger-button" type="button">
              Danger
            </button>
            <button className="primary-button" disabled type="button">
              Disabled
            </button>
          </div>
          <div className="field-grid two">
            <label>
              Text input
              <input className="text-input" defaultValue="Guwahati" />
            </label>
            <label>
              Select
              <select className="select-input" defaultValue="a">
                <option value="a">An option</option>
              </select>
            </label>
          </div>
          <p className="helper-text">A helper text, under a field.</p>
          <p className="error-text">An error, when something is wrong.</p>
        </StyleSection>

        <StyleSection
          title="Layers"
          note="Lowest first. The header outranks every scrim, always."
        >
          <StyleRows className="style-layers" ordered rows={LAYERS} />
        </StyleSection>

        <StyleSection
          title="Motion"
          note="All of these sit inside motion(), so they stop if you ask them to."
        >
          <StyleRows
            className="style-motion"
            rows={DURATIONS.map((name) => ({ name }))}
          />
        </StyleSection>
      </div>
    </AppShell>
  );
}
