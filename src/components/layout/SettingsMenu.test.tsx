import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { SettingsMenu } from './SettingsMenu';

const renderMenu = (overrides: Partial<Parameters<typeof SettingsMenu>[0]> = {}) => {
  const onAppearanceChange = vi.fn();
  const onSoundChange = vi.fn();
  render(
    <SettingsMenu
      appearance="edition"
      appearanceLabel="Match the edition"
      onAppearanceChange={onAppearanceChange}
      onSoundChange={onSoundChange}
      soundEnabled
      {...overrides}
    />
  );
  return { onAppearanceChange, onSoundChange };
};

describe('SettingsMenu', () => {
  it('starts closed', () => {
    renderMenu();

    expect(screen.getByTestId(TEST_IDS.settingsTrigger)).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByTestId(TEST_IDS.settingsPanel)).not.toBeInTheDocument();
  });

  it('opens on the trigger and says so', () => {
    renderMenu();

    fireEvent.click(screen.getByTestId(TEST_IDS.settingsTrigger));

    expect(screen.getByTestId(TEST_IDS.settingsTrigger)).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId(TEST_IDS.settingsPanel)).toBeInTheDocument();
  });

  // A menu that only closes one way is a menu you get stuck in.
  it('closes on Escape', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId(TEST_IDS.settingsTrigger));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId(TEST_IDS.settingsPanel)).not.toBeInTheDocument();
  });

  it('closes on a press outside', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId(TEST_IDS.settingsTrigger));

    fireEvent.pointerDown(document.body);

    expect(screen.queryByTestId(TEST_IDS.settingsPanel)).not.toBeInTheDocument();
  });

  it('stays open for a press on its own controls', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId(TEST_IDS.settingsTrigger));

    fireEvent.pointerDown(screen.getByTestId(TEST_IDS.appearanceSelect));

    expect(screen.getByTestId(TEST_IDS.settingsPanel)).toBeInTheDocument();
  });

  it('reports the sound state as a pressed toggle', () => {
    const { onSoundChange } = renderMenu({ soundEnabled: false });
    fireEvent.click(screen.getByTestId(TEST_IDS.settingsTrigger));

    const toggle = screen.getByTestId(TEST_IDS.soundToggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(onSoundChange).toHaveBeenCalledWith(true);
  });

  it('changes the appearance', () => {
    const { onAppearanceChange } = renderMenu();
    fireEvent.click(screen.getByTestId(TEST_IDS.settingsTrigger));

    fireEvent.change(screen.getByTestId(TEST_IDS.appearanceSelect), {
      target: { value: 'aesthetic' },
    });

    expect(onAppearanceChange).toHaveBeenCalledWith('aesthetic');
  });

  /**
   * The trigger is an icon, so its accessible name is the only thing telling a
   * screen-reader user what is behind it - and what the settings currently are.
   */
  it('names both settings in the trigger for a screen reader', () => {
    renderMenu({ appearanceLabel: 'Aesthetic', soundEnabled: false });

    expect(
      screen.getByRole('button', { name: /sound off, appearance: Aesthetic/i })
    ).toBeInTheDocument();
  });
});
