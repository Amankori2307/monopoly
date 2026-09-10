import { expect, test, type Page } from '@playwright/test';
import { startGame, VIEWPORTS } from './helpers';

/**
 * The owner wash has to stay legible on every palette in the app.
 *
 * `themeContract.guard.test.ts` proves every contract token is READ, and the
 * Sass guard proves every palette defines one - neither can say whether the
 * result can be read. CLAUDE.md records what that costs: `midnight` shipped a
 * danger button at 1.03:1 and `aesthetic` an eyebrow at 3.24:1, both unnoticed.
 * The board's wash is exactly the kind of change that could do it again, since
 * it paints an arbitrary player colour under the darkest ink on the square.
 *
 * The cases are the six that differ. An appearance is a palette, so `midnight`
 * and `aesthetic` are one palette each whatever board is under them; the
 * `edition` appearance resolves to the edition's OWN palette, so all four are
 * distinct there.
 */

const CASES: { edition: string; appearance: string }[] = [
  { edition: 'Monopoly India Edition', appearance: 'edition' },
  { edition: 'Monopoly Classic (London)', appearance: 'edition' },
  { edition: 'Monopoly Classic (Atlantic City)', appearance: 'edition' },
  { edition: 'Monopoly World Cities', appearance: 'edition' },
  { edition: 'Monopoly India Edition', appearance: 'aesthetic' },
  { edition: 'Monopoly India Edition', appearance: 'midnight' },
];

/** WCAG relative luminance. */
const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const probe = async (page: Page) =>
  page.evaluate(() => {
    const parse = (value: string) =>
      (value.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    // The wash is a background-image layer over background-color, so the
    // painted result has to be composited: alpha is baked into color-mix.
    return Array.from(document.querySelectorAll('.board-space.is-owned'))
      .slice(0, 40)
      .map((cell) => {
        const style = getComputedStyle(cell);
        const text = cell.querySelector('.space-name, .space-name-short');
        // The wash is `color-mix(in srgb, var(--space-owner) 14%, transparent)`
        // painted as a background-IMAGE over background-color, so the computed
        // background-color alone is the untinted cell. Composite it by hand:
        // 14% of the owner's colour over 86% of the cell.
        const owner = parse(
          getComputedStyle(cell).getPropertyValue('--space-owner').trim() ||
            style.backgroundColor
        );
        const raw = parse(style.backgroundColor);
        const hex = getComputedStyle(cell).getPropertyValue('--space-owner').trim();
        const fromHex = /^#/.test(hex)
          ? [1, 3, 5].map((i) =>
              parseInt(
                hex.length === 4
                  ? hex[(i + 1) / 2] + hex[(i + 1) / 2]
                  : hex.slice(i, i + 2),
                16
              )
            )
          : owner;
        return {
          name: cell.getAttribute('aria-label') ?? '',
          bg: raw.map((channel, i) => 0.14 * fromHex[i] + 0.86 * channel),
          image: style.backgroundImage,
          ink: text ? parse(getComputedStyle(text).color) : null,
        };
      });
  });

test.use({ viewport: VIEWPORTS.desktop });

test.describe('the owner wash stays legible', () => {
  for (const { edition, appearance } of CASES) {
    test(`on ${edition} in ${appearance}`, async ({ page }) => {
      await startGame(page, { edition });
      await page.evaluate((id) => {
        localStorage.setItem('monopoly.appearance.v1', id);
      }, appearance);
      await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) =>
          k.startsWith('monopoly.game.')
        ) as string;
        const game = JSON.parse(localStorage.getItem(key) as string);
        let i = 0;
        game.board.forEach((s: { id: string; kind: string }) => {
          if (!['street', 'railway', 'utility'].includes(s.kind)) return;
          game.ownership[s.id].ownerPlayerId =
            game.playerOrder[i % game.playerOrder.length];
          i += 1;
        });
        localStorage.setItem(key, JSON.stringify(game));
      });
      await page.reload();
      await page.waitForTimeout(900);

      const cells = await probe(page);
      expect(cells.length).toBeGreaterThan(20);

      const worst = cells
        .filter((cell) => cell.ink)
        .map((cell) => {
          const bg = luminance(cell.bg);
          const ink = luminance(cell.ink as number[]);
          const ratio = (Math.max(bg, ink) + 0.05) / (Math.min(bg, ink) + 0.05);
          return { name: cell.name, ratio: Number(ratio.toFixed(2)) };
        })
        .sort((a, b) => a.ratio - b.ratio)[0];

      // The wash is actually painted, not silently dropped - which is what a
      // browser without color-mix would do, and would make this vacuous.
      expect(cells[0].image).toContain('gradient');
      // WCAG AA for body text. The measured worst case is about 10.7:1, so
      // this failing means something moved a long way.
      expect(worst.ratio, `${worst.name}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
