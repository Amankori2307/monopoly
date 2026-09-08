import {
  APPEARANCES,
  EDITION_APPEARANCE,
  type AppearanceId,
} from '../constants/appearance.constants';

/**
 * What to put in `data-theme`.
 *
 * One function, because three pages ask the question and every one of them has
 * a different idea of "the current edition": the game page knows the game's,
 * the setup form knows the one being picked, and the rules page has no game at
 * all. Answering it in each of them is how two of them end up disagreeing.
 *
 * `edition` is not a palette - there is no `[data-theme="edition"]` block - so
 * it resolves to the edition's own id, which is what the attribute carried
 * before appearances existed. That keeps the default byte-identical to the old
 * behaviour rather than merely similar to it.
 */
export const resolveAppearanceTheme = (
  appearance: AppearanceId,
  editionId: string
): string => (appearance === EDITION_APPEARANCE ? editionId : appearance);

/**
 * The appearance after this one, wrapping round.
 *
 * Cycling rather than a boolean toggle: there are two appearances today and a
 * toggle would quietly become wrong on the day there is a third, which is
 * exactly the sort of thing that ships.
 */
export const nextAppearance = (appearance: AppearanceId): AppearanceId => {
  const index = APPEARANCES.findIndex((option) => option.id === appearance);
  return APPEARANCES[(index + 1) % APPEARANCES.length].id;
};

/** The label for an appearance, for a control that has to name it. */
export const appearanceLabel = (appearance: AppearanceId): string =>
  APPEARANCES.find((option) => option.id === appearance)?.label ?? appearance;
