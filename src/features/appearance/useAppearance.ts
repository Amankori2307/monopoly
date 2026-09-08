import { useAppDispatch, useAppSelector } from '../../app/hooks';
import type { AppearanceId } from '../../shared/constants/appearance.constants';
import {
  appearanceLabel,
  nextAppearance,
  resolveAppearanceTheme,
} from '../../shared/utils/appearance.utils';
import { setAppearance } from '../game/uiSlice';

interface UseAppearanceResult {
  /** The stored preference. */
  appearance: AppearanceId;
  /** What to put in `data-theme`, given the edition on screen. */
  dataTheme: string;
  /** The current appearance's name, for a control that has to say it. */
  label: string;
  select: (appearance: AppearanceId) => void;
  /** Moves to the next appearance, wrapping. */
  cycle: () => void;
}

/**
 * The appearance preference and everything a page does with it.
 *
 * One hook because three pages ask the same question and each of them would
 * otherwise repeat the selector, the dispatch and - the part that actually
 * matters - the fallback from `edition` to the edition's own id. Answering it
 * separately in each page is how two of them end up disagreeing.
 */
export const useAppearance = (editionId: string): UseAppearanceResult => {
  const dispatch = useAppDispatch();
  const appearance = useAppSelector((state) => state.ui.appearance);

  return {
    appearance,
    dataTheme: resolveAppearanceTheme(appearance, editionId),
    label: appearanceLabel(appearance),
    select: (next) => dispatch(setAppearance(next)),
    cycle: () => dispatch(setAppearance(nextAppearance(appearance))),
  };
};
