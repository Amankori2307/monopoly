import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { AppearanceId } from '../../shared/constants/appearance.constants';
import { NAV_ITEMS } from '../../shared/constants/nav.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { SettingsMenu } from './SettingsMenu';

interface AppHeaderProps {
  /** An extra control for screens that have one. Rendered before settings. */
  activity?: ReactNode;
  appearance: AppearanceId;
  /** The current appearance's name, for the settings trigger's own label. */
  appearanceLabel: string;
  onAppearanceChange: (appearance: AppearanceId) => void;
  onSoundChange: (enabled: boolean) => void;
  soundEnabled: boolean;
}

/**
 * The one place the app is navigated from.
 *
 * There was no header at all: the way to the rules was a link on the home page,
 * the way back was a link on the rules page, and the game screen kept Home,
 * Rules, a sound switch and an appearance cycler in its own sidebar — four
 * controls that are not about the game, taking room from the game on the
 * smallest screens.
 *
 * `NavLink` rather than `Link` for the nav, so the current place is marked with
 * `aria-current` rather than only a colour.
 */
export function AppHeader({
  activity,
  appearance,
  appearanceLabel,
  onAppearanceChange,
  onSoundChange,
  soundEnabled,
}: AppHeaderProps) {
  return (
    <header className="app-header" data-testid={TEST_IDS.appHeader}>
      <Link className="app-brand" to="/">
        Monopoly
      </Link>

      <nav aria-label="Main" className="app-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            className={({ isActive }) => `app-nav-link ${isActive ? 'is-current' : ''}`}
            end={item.to === '/'}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* The game's log lives here rather than in the bar beside the dice:
          it is chrome, not a game control, and the bar is the tightest row on
          a phone - it wrapped to two lines whenever End turn was showing. */}
      {activity}

      <SettingsMenu
        appearance={appearance}
        appearanceLabel={appearanceLabel}
        onAppearanceChange={onAppearanceChange}
        onSoundChange={onSoundChange}
        soundEnabled={soundEnabled}
      />
    </header>
  );
}
