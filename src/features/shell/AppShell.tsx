import type { ReactNode } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useAppearance } from '../appearance/useAppearance';
import { setSoundEnabled } from '../game/uiSlice';

interface AppShellProps {
  children: ReactNode;
  /** Extra classes on the shell, e.g. `is-game`, `rules-shell`. */
  className?: string;
  /**
   * Whose palette to use when no appearance overrides it. Every page has a
   * different idea of "the current edition" - the game's own, the one being
   * picked in a form, or the default - so the page says, rather than this
   * guessing.
   */
  editionId: string;
}

/**
 * The themed shell and the header, for every page.
 *
 * Each page used to render its own `.app-shell`, resolve its own `data-theme`
 * and reach for `useAppearance` itself. This is the one owner of all three, so
 * a new screen gets the header and the palette by rendering this rather than by
 * remembering to.
 *
 * Deliberately NOT a router layout route with an `<Outlet/>`: `data-theme`
 * comes from a different place on each page, so hoisting the shell above the
 * routes would mean pushing that value back down through context to get
 * exactly what a prop already gives.
 */
export function AppShell({ children, className = '', editionId }: AppShellProps) {
  const dispatch = useAppDispatch();
  const look = useAppearance(editionId);
  const soundEnabled = useAppSelector((state) => state.ui.soundEnabled);

  return (
    <div className={`app-shell ${className}`.trim()} data-theme={look.dataTheme}>
      <AppHeader
        appearance={look.appearance}
        appearanceLabel={look.label}
        onAppearanceChange={look.select}
        onSoundChange={(enabled) => dispatch(setSoundEnabled(enabled))}
        soundEnabled={soundEnabled}
      />
      {children}
    </div>
  );
}
