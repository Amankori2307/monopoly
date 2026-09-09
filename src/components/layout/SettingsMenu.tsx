import { useRef, useState } from 'react';
import {
  APPEARANCES,
  type AppearanceId,
} from '../../shared/constants/appearance.constants';
import { useEscapeKey } from '../../shared/hooks/useEscapeKey';
import { useOutsideClick } from '../../shared/hooks/useOutsideClick';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface SettingsMenuProps {
  appearance: AppearanceId;
  appearanceLabel: string;
  onAppearanceChange: (appearance: AppearanceId) => void;
  onSoundChange: (enabled: boolean) => void;
  soundEnabled: boolean;
}

/**
 * Sound and appearance, in a menu rather than on the page.
 *
 * They were scattered: an appearance `<select>` inside the new-game form —
 * which implied it was saved with the game, when it is a per-device preference —
 * and a sound toggle plus a second appearance control in the game sidebar. Three
 * controls for two settings, none of them anywhere a player would look.
 *
 * Dismissal is both halves, because a menu that only closes one way is a menu
 * you get stuck in: Escape via `useEscapeKey`, click-away via
 * `useOutsideClick`. The wrapper is the ref, so a press on an item inside is
 * not a dismiss.
 */
export function SettingsMenu({
  appearance,
  appearanceLabel,
  onAppearanceChange,
  onSoundChange,
  soundEnabled,
}: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);
  useEscapeKey(isOpen, close);
  useOutsideClick(wrapper, isOpen, close);

  return (
    <div className="settings-menu" ref={wrapper}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Settings - sound ${
          soundEnabled ? 'on' : 'off'
        }, appearance: ${appearanceLabel}`}
        className="settings-trigger"
        data-testid={TEST_IDS.settingsTrigger}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {/* Sliders rather than a cog: it is what these two controls are. */}
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <path d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z" fill="currentColor" />
          <path
            d="M16 2.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM8 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM17 14.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="settings-panel" data-testid={TEST_IDS.settingsPanel}>
          <p className="settings-heading">Settings</p>

          <div className="settings-row">
            <span id="app-settings-sound">Sound</span>
            {/* An icon, so the button needs its own accessible name: the label
                beside it is not the control's name, and a name must never live
                in visible text alone (CLAUDE.md section 8). */}
            <button
              aria-label={
                soundEnabled ? 'Sound is on. Mute it.' : 'Sound is muted. Turn it on.'
              }
              aria-pressed={soundEnabled}
              className="secondary-button settings-icon-button"
              data-testid={TEST_IDS.soundToggle}
              onClick={() => onSoundChange(!soundEnabled)}
              type="button"
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                {/* The speaker, drawn once. */}
                <path d="M4 9h3.2L13 4.2v15.6L7.2 15H4z" fill="currentColor" />
                {soundEnabled ? (
                  // Two arcs, as bars rather than strokes: this wrapper fills
                  // rather than strokes, like every other icon here.
                  <path
                    d="M15.6 7.7a1 1 0 0 1 1.4.2 6.5 6.5 0 0 1 0 8.2 1 1 0 0 1-1.6-1.2 4.5 4.5 0 0 0 0-5.8 1 1 0 0 1 .2-1.4zM18.4 4.9a1 1 0 0 1 1.4.1 10.4 10.4 0 0 1 0 14 1 1 0 0 1-1.5-1.4 8.4 8.4 0 0 0 0-11.3 1 1 0 0 1 .1-1.4z"
                    fill="currentColor"
                  />
                ) : (
                  // A cross, which reads as muted at 18px where a single
                  // diagonal slash does not.
                  <path
                    d="M16.3 9.3 17.7 8l5 5-1.4 1.4zM21.3 8l1.4 1.3-5 5L16.3 13z"
                    fill="currentColor"
                  />
                )}
              </svg>
            </button>
          </div>

          <label className="settings-row is-stacked">
            Appearance
            <select
              className="select-input"
              data-testid={TEST_IDS.appearanceSelect}
              onChange={(event) => onAppearanceChange(event.target.value as AppearanceId)}
              value={appearance}
            >
              {APPEARANCES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p className="settings-note">Remembered on this device, for every game.</p>
        </div>
      ) : null}
    </div>
  );
}
