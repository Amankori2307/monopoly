import {
  DOUBLES_BEFORE_JAIL,
  JAIL_FINE,
  MAX_JAIL_TURNS,
  MORTGAGE_INTEREST_PERCENT,
} from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

/**
 * Rules booklet section. The questions that actually come up in play.
 *
 * Mirrors the "Quick answers" section of docs/india-edition-rules.md — the two
 * are kept in step by rulesSync.test.ts.
 */
export function RulesFaq() {
  return (
    <section id="faq">
      <p className="eyebrow">Frequently asked</p>
      <h2>The questions that come up mid-game</h2>

      <dl className="rules-faq">
        <dt>How many times can I roll in one turn?</dt>
        <dd>
          At most {DOUBLES_BEFORE_JAIL}, and they are separate rolls: you roll, move, and
          resolve that space completely — buying, paying rent, drawing a card — before
          rolling again. You do not throw {DOUBLES_BEFORE_JAIL} times and then look at
          them. Everything your earlier rolls did <strong>stands</strong>.
        </dd>

        <dt>What happens to my earlier rolls if the third one jails me?</dt>
        <dd>
          They still happened. Only the {DOUBLES_BEFORE_JAIL}rd roll is discarded — you
          move nowhere, resolve no space, and collect no GO salary for it. A site you
          bought on your first roll is still yours, and rent you paid on your second stays
          paid. You simply end up in Jail having done all of it.
        </dd>

        <dt>I rolled a double and landed in Jail. Do I roll again?</dt>
        <dd>
          No. Your turn ends immediately and the extra roll is forfeited. That holds
          however you got there: landing on Go To Jail, drawing a card, or rolling your{' '}
          {DOUBLES_BEFORE_JAIL}rd double.
        </dd>

        <dt>How many rolls do I get while in Jail?</dt>
        <dd>
          One per turn, for up to {MAX_JAIL_TURNS} turns — the {MAX_JAIL_TURNS} is turns,
          not rolls in one turn. Roll a double and you leave, move by that roll, and your
          turn ends; there is no bonus roll. Fail {MAX_JAIL_TURNS} times and you must pay{' '}
          {formatMoney(JAIL_FINE)} and move using that final roll. Doubles rolled in Jail
          do not count towards the {DOUBLES_BEFORE_JAIL}-doubles rule.
        </dd>

        <dt>Can I sell a site I own?</dt>
        <dd>
          Only to another player, at any price you both agree. The Bank never buys
          property back, and you cannot auction property you own — an auction only ever
          happens when a player declines an <em>unowned</em> property. A mortgaged site
          can be traded; a site with buildings on it cannot until they are sold.
        </dd>

        <dt>Can I mortgage a site with houses on it?</dt>
        <dd>
          No. Sell every building in that colour set back to the Bank first. The same
          restriction blocks trading it.
        </dd>

        <dt>What do buildings sell for?</dt>
        <dd>
          Half what you paid, to the Bank only — never to another player. Selling must be
          even across the colour set, the same rule as building, in reverse.
        </dd>

        <dt>What does it cost to lift a mortgage?</dt>
        <dd>The mortgage value plus {MORTGAGE_INTEREST_PERCENT}%.</dd>

        <dt>Does a mortgaged site still count towards my colour set?</dt>
        <dd>
          Yes. Mortgaging is a loan, not a sale. Own all three of a colour set and
          mortgage one, and the other two still charge doubled rent. The same applies to
          railway and utility counts.
        </dd>

        <dt>Does the Speed Die count towards doubles?</dt>
        <dd>
          No. Only the two white dice decide a double, and only they count for rolling out
          of Jail. If all three dice match you may move to any space on the board — that
          is not a double, so it earns no extra roll.
        </dd>
      </dl>

      <p className="source-note">
        Every rule on this page is playable. Manage a site you own by clicking it on the
        board.
      </p>
    </section>
  );
}
