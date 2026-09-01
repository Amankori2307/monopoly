import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RULES_SECTIONS } from '../../components/rules/rulesSections.constants';
import {
  INCOME_TAX_AMOUNT,
  RAILWAY_RENT_BY_COUNT,
  SUPER_TAX_AMOUNT,
} from '../../domain/constants/board.constants';
import {
  AUCTION_MIN_INCREMENT,
  AUCTION_START_PRICE,
  DOUBLES_BEFORE_JAIL,
  HOTELS_AVAILABLE,
  HOUSES_AVAILABLE,
  JAIL_FINE,
  MAX_JAIL_TURNS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MORTGAGE_INTEREST_PERCENT,
  PASS_GO_AMOUNT,
  SPEED_DIE_BONUS_CASH,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/**
 * The in-app rules booklet and docs/india-edition-rules.md must stay in sync.
 *
 * Prose cannot be diffed, but the two things that actually go stale can be
 * checked: the set of topics each covers, and every number quoted. When a
 * ruleset constant changes, the booklet follows automatically because it renders
 * from the constant - the markdown does not, and that is exactly the drift this
 * catches.
 */
const RULES_DOC_PATH = resolve(process.cwd(), 'docs/india-edition-rules.md');

if (!existsSync(RULES_DOC_PATH)) {
  throw new Error(
    `Cannot find ${RULES_DOC_PATH}. This test reads the ruleset doc from the repo root; run it from there.`
  );
}

const RULES_DOC = readFileSync(RULES_DOC_PATH, 'utf8');

/** Every ruleset value both documents quote, and where it comes from. */
const QUOTED_VALUES: ReadonlyArray<{ name: string; text: string }> = [
  { name: 'STARTING_CASH', text: formatMoney(STARTING_CASH) },
  { name: 'PASS_GO_AMOUNT', text: formatMoney(PASS_GO_AMOUNT) },
  { name: 'JAIL_FINE', text: formatMoney(JAIL_FINE) },
  { name: 'AUCTION_START_PRICE', text: formatMoney(AUCTION_START_PRICE) },
  { name: 'AUCTION_MIN_INCREMENT', text: formatMoney(AUCTION_MIN_INCREMENT) },
  { name: 'SPEED_DIE_BONUS_CASH', text: formatMoney(SPEED_DIE_BONUS_CASH) },
  { name: 'HOUSES_AVAILABLE', text: String(HOUSES_AVAILABLE) },
  { name: 'HOTELS_AVAILABLE', text: String(HOTELS_AVAILABLE) },
  { name: 'MORTGAGE_INTEREST_PERCENT', text: `${MORTGAGE_INTEREST_PERCENT}%` },
  // Board data rather than a game constant, but the doc quotes both in its
  // section 13 "Values:" line and neither was checked.
  { name: 'INCOME_TAX_AMOUNT', text: formatMoney(INCOME_TAX_AMOUNT) },
  { name: 'SUPER_TAX_AMOUNT', text: formatMoney(SUPER_TAX_AMOUNT) },
  ...RAILWAY_RENT_BY_COUNT.map((rent, index) => ({
    name: `RAILWAY_RENT_BY_COUNT[${index}]`,
    text: formatMoney(rent),
  })),
];

describe('rules page and ruleset doc stay in sync', () => {
  it.each(RULES_SECTIONS)(
    'the doc has a heading covering the "$label" section',
    ({ label, docHeading }) => {
      expect(
        RULES_DOC,
        `docs/india-edition-rules.md has no heading starting "${docHeading}" for the rules page's "${label}" section. Add the section to the doc, or update docHeading in rulesSections.constants.ts.`
      ).toContain(docHeading);
    }
  );

  it.each(QUOTED_VALUES)('the doc quotes $name as $text', ({ name, text }) => {
    expect(
      RULES_DOC,
      `docs/india-edition-rules.md does not mention ${text}. ${name} changed and the doc went stale - the booklet updated itself because it renders from the constant.`
    ).toContain(text);
  });

  it('the doc states the player count range', () => {
    expect(RULES_DOC).toContain(`${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  });

  // The two rules people misread. Both documents must state them explicitly,
  // because "three" means turns in one place and rolls in the other.
  it('the doc states the roll ceiling in a turn', () => {
    expect(RULES_DOC.toLowerCase()).toContain('at most three rolls');
    expect(DOUBLES_BEFORE_JAIL).toBe(3);
  });

  it('the doc states that Jail is one roll per turn', () => {
    expect(RULES_DOC.toLowerCase()).toContain('one roll per turn');
    expect(MAX_JAIL_TURNS).toBe(3);
  });

  it('the doc records that going to Jail ends the turn', () => {
    expect(RULES_DOC.toLowerCase()).toContain('your turn ends immediately');
  });

  it('the doc records that you cannot auction property you own', () => {
    expect(RULES_DOC.toLowerCase()).toContain('cannot auction property you own');
  });
});

/**
 * Every nav link points at a section the page actually renders.
 *
 * The nav is built from RULES_SECTIONS, but each section's markup writes its
 * own `id` by hand - so a renamed id breaks the link silently, and the only
 * symptom is a nav item that scrolls nowhere.
 */
describe('the rules page nav', () => {
  const RULES_COMPONENT_DIR = resolve(process.cwd(), 'src/components/rules');

  /** Every `id="..."` on a section across the booklet's components. */
  const renderedSectionIds = (): string[] =>
    readdirSync(RULES_COMPONENT_DIR)
      .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
      .flatMap((file) => {
        const source = readFileSync(resolve(RULES_COMPONENT_DIR, file), 'utf8');
        return [...source.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]);
      });

  it.each(RULES_SECTIONS.map((section) => section.id))(
    'has a section with id "%s" for its nav link to reach',
    (id) => {
      expect(renderedSectionIds()).toContain(id);
    }
  );

  it('renders no section the nav cannot reach', () => {
    const navIds = RULES_SECTIONS.map((section) => section.id);

    renderedSectionIds().forEach((id) => expect(navIds).toContain(id));
  });
});
