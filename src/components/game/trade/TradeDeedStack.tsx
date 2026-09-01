import type { TradableSite } from '../../../domain/rules/trade.utils';
import type { SpaceId } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { SpaceCard } from '../deed/SpaceCard';

interface TradeDeedStackProps {
  currencySymbol: string;
  onToggle: (spaceId: SpaceId) => void;
  selectedSpaceIds: SpaceId[];
  sites: TradableSite[];
  /** Which half of the deal this is, so the controls get unique ids. */
  side: string;
}

/**
 * One player's holdings, as a stack of real title deeds you pick from.
 *
 * A deed is 340x380 and a player can hold up to 28 of them, so they cannot all
 * be laid out - but the holdings drawer already solved that: clip each card to a
 * peek of its top and tuck it under the one above, so the whole hand is visible
 * as real deeds. **Selecting a card expands it to full size**, which makes the
 * deal you are assembling literally a set of title deeds while everything else
 * stays a readable peek.
 *
 * This replaced a checkbox list of names with `(mortgaged)` appended, on which
 * players were agreeing to deals: no colour group, no price, no rent, no
 * buildings. The mortgage stamp lands inside the peek, so that much is answered
 * without expanding anything.
 *
 * Close kin to [HoldingsStack](../overlays/HoldingsStack.tsx) and deliberately
 * not the same component: that one promotes exactly one card and selects
 * nothing. They share the peek and tuck tokens, so a change to the shape of the
 * idea belongs in both.
 */
export function TradeDeedStack({
  currencySymbol,
  onToggle,
  selectedSpaceIds,
  sites,
  side,
}: TradeDeedStackProps) {
  if (sites.length === 0) {
    return <p className="trade-empty">No sites to trade.</p>;
  }

  return (
    <div
      className="trade-deed-stack"
      data-testid={scopedTestId(TEST_IDS.tradeDeedStack, side)}
    >
      {sites.map((site) => {
        const isSelected = selectedSpaceIds.includes(site.spaceId);
        const isBlocked = site.blockedReason !== '';

        return (
          <article
            className={`trade-deed ${isSelected ? 'is-selected' : ''} ${
              isBlocked ? 'is-blocked' : ''
            }`}
            data-testid={scopedTestId(TEST_IDS.tradeDeed, site.spaceId)}
            key={site.spaceId}
          >
            {/* An overlay button rather than a wrapper, so the deed's own
                heading is not nested inside a control - the same arrangement
                HoldingsStack uses. */}
            <button
              aria-label={`${isSelected ? 'Remove' : 'Add'} ${site.space.name}${
                isBlocked ? ` - ${site.blockedReason}` : ''
              }`}
              aria-pressed={isSelected}
              className="trade-deed-pick"
              data-testid={scopedTestId(TEST_IDS.tradeSite, site.spaceId)}
              disabled={isBlocked}
              onClick={() => onToggle(site.spaceId)}
              type="button"
            />

            <SpaceCard
              currencySymbol={currencySymbol}
              headingId={`trade-${side}-${site.spaceId}`}
              ownership={site.ownership}
              space={site.space}
            />

            {/* Why it cannot go in, on the card rather than in a title
                attribute nobody hovers. */}
            {isBlocked ? (
              <p
                className="trade-deed-blocked"
                data-testid={scopedTestId(TEST_IDS.tradeDeedBlocked, site.spaceId)}
              >
                {site.blockedReason}
              </p>
            ) : null}

            {isSelected ? (
              <p aria-hidden="true" className="trade-deed-mark">
                In the deal
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
