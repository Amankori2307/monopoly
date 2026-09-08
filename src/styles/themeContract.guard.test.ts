import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every token in the theme contract is actually read by something.
 *
 * The Sass guard in `themes/_themes.scss` already runs both directions - a
 * theme missing a contract token fails the build, and a theme defining one that
 * is *not* in the contract fails it too. What neither direction can see is a
 * token that is in the contract, defined by every theme, and read by nothing:
 * Sass cannot scan the other stylesheets.
 *
 * That gap is not theoretical. It hid six dead tokens - `decision-bg`,
 * `decision-border`, `token-bg`, `action-sell`, `action-redeem` and
 * `action-text` - which every palette had to keep inventing values for. One of
 * them had been orphaned by a stylesheet deletion and nothing noticed.
 *
 * theming.md puts it plainly: a token nothing reads is a trap, because it is a
 * token the next person will assume something reads. So the rule is the one the
 * doc already states, and this is what makes it true: **add a contract token in
 * the same change as the rule that reads it, not before.**
 */

const REPO_ROOT = join(__dirname, '../..');
const THEMES_FILE = join(__dirname, 'themes/_themes.scss');

/** Everything that could legitimately read a custom property. */
const collectSources = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) {
      continue;
    }
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      collectSources(path, found);
    } else if (/\.(scss|ts|tsx)$/.test(entry) && path !== THEMES_FILE) {
      found.push(path);
    }
  }
  return found;
};

const contractTokens = (): string[] => {
  const scss = readFileSync(THEMES_FILE, 'utf8');
  const match = /\$theme-contract:([\s\S]*?);/.exec(scss);
  if (!match) {
    throw new Error('$theme-contract is not declared in styles/themes/_themes.scss');
  }
  return match[1].split(/\s+/).filter(Boolean);
};

describe('the theme contract', () => {
  const tokens = contractTokens();
  const body = [
    ...collectSources(join(REPO_ROOT, 'src')),
    ...collectSources(join(REPO_ROOT, 'tests')),
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  it('declares a reasonable number of tokens', () => {
    // A sanity check on the parse itself: a regex that silently matched nothing
    // would make every assertion below pass.
    expect(tokens.length).toBeGreaterThan(50);
  });

  it.each(tokens)('has something that reads --%s', (token) => {
    expect(body).toContain(`--${token}`);
  });
});
