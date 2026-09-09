import { useEffect, useState } from 'react';
import type { PaletteSwatch } from './styleGuide.interfaces';

/** A value a swatch can actually paint: a colour, or a gradient of them. */
const COLOUR_VALUE = /^(#|rgb|hsl|[a-z-]*gradient\()/i;

/**
 * Every custom property the active palette defines, read from the DOM.
 *
 * Deliberately NOT a list in TypeScript. `themeContract.guard.test.ts` proves
 * every contract token is read by something, by scanning the source for its
 * name - so a page that enumerated all 72 of them would make every token
 * "read" for ever and turn the guard that found six dead tokens into a rubber
 * stamp. Reading them at runtime means this page names none of them.
 *
 * It also means a swatch cannot claim a value the palette does not have, and
 * that changing the appearance repaints the page - which is the real check
 * that a palette is one decision rather than seventy-two.
 */
export const useThemeTokens = (): PaletteSwatch[] => {
  const [tokens, setTokens] = useState<PaletteSwatch[]>([]);

  useEffect(() => {
    const shell = document.querySelector('.app-shell') ?? document.documentElement;
    const computed = getComputedStyle(shell);
    const found: PaletteSwatch[] = [];
    // getComputedStyle enumerates custom properties in current browsers and
    // not in jsdom, so this is empty under unit test and full in the e2e run -
    // which is why the assertion that it is non-empty lives in the e2e spec.
    for (let index = 0; index < computed.length; index += 1) {
      const name = computed.item(index);
      if (!name.startsWith('--')) continue;
      const value = computed.getPropertyValue(name).trim();
      // Colour only. The shell and the header publish layout metrics as custom
      // properties too - --app-header-height, --app-frame-height - and a
      // swatch of "56px" is nonsense.
      if (value && COLOUR_VALUE.test(value)) found.push({ name, value });
    }
    setTokens(found.sort((a, b) => a.name.localeCompare(b.name)));
    // The appearance is applied to .app-shell as data-theme, so re-reading on
    // a change is what makes the swatches follow it.
  }, []);

  return tokens;
};
