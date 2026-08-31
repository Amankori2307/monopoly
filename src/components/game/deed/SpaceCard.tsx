import type { ReactNode } from 'react';
import { isOwnableSpace, isStreetSpace } from '../../../domain/rules/space.utils';
import { SpaceKind } from '../../../domain/types/game.enums';
import type { BoardSpace, OwnershipState } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { getSpaceIcon } from '../spaceIcons.constants';
import { RailwayDeed } from './RailwayDeed';
import { SpaceDescription } from './SpaceDescription';
import { StreetDeed } from './StreetDeed';
import { UtilityDeed } from './UtilityDeed';

interface SpaceCardProps {
  /**
   * Optional actions rendered under the card body. Only usable on a space that
   * is not a deed: a deed is a fixed height with overflow hidden, so anything
   * appended inside it is clipped. Deed callers put their buttons beside the
   * card instead - see SpaceDetailCard and BuyOrAuctionDecision.
   */
  actions?: ReactNode;
  currencySymbol: string;
  /** Id for the card's heading, so a dialog can point aria-labelledby at it. */
  headingId?: string;
  /**
   * Ownership of this space, when the caller knows it. Optional because the
   * board's own deed modal shows spaces nobody owns.
   */
  ownership?: OwnershipState;
  space: BoardSpace;
}

/**
 * The site card: title, icon, and the per-kind deed body.
 *
 * Shared by the title-deed modal, the buy decision, and the holdings drawer, so
 * a player sees exactly the same card whether they are browsing a space,
 * deciding to buy it, or reading their portfolio. The card supplies its own
 * surface and fixed dimensions - callers position it, they do not dress it.
 * Presentation only: the caller supplies any actions.
 */
/**
 * Which colour the card's top strip takes. Streets carry their group's colour;
 * railways and utilities have no group, so they take ink - distinct from all
 * eight group colours, and the colour railways wear on a real board. The theme
 * accent is deliberately not used here: it is a red within a few points of
 * --group-red, so a railway would have read as a red street.
 */
const bandModifier = (space: BoardSpace): string =>
  isStreetSpace(space) ? `group-${space.colorGroup}` : 'is-ink';

export function SpaceCard({
  actions,
  currencySymbol,
  headingId = 'space-card-title',
  ownership,
  space,
}: SpaceCardProps) {
  const icon = getSpaceIcon(space);
  // Every card is the same size; this only pins a deed's house/hotel footer to
  // the bottom of it. A Chance or tax card has no footer to pin.
  const isDeed = isOwnableSpace(space);
  // Railways and utilities are deeds too - owned, mortgaged, and collecting
  // rent - so the label follows ownability, not just streets.
  const title = isDeed ? 'Title deed' : 'Board space';

  return (
    <div
      className={`deed-card space-card-body ${isDeed ? 'is-deed' : ''}`}
      data-testid={TEST_IDS.spaceCard}
    >
      {/* The card opens with its colour, flush to the top edge. The colour
          itself comes from a .group-* utility, so it follows the active theme. */}
      {isDeed ? (
        <div
          className={`deed-band ${bandModifier(space)}`}
          data-testid={TEST_IDS.deedBand}
        />
      ) : null}
      <p className="eyebrow">{title}</p>
      {ownership?.mortgaged ? (
        <p className="deed-mortgaged" data-testid={TEST_IDS.deedMortgaged}>
          Mortgaged
        </p>
      ) : null}
      <div className="space-detail-title-row">
        {icon ? (
          <img alt="" aria-hidden="true" className="space-detail-icon" src={icon} />
        ) : null}
        <h2 id={headingId}>{space.name}</h2>
      </div>

      {space.kind === SpaceKind.Street ? (
        <StreetDeed currencySymbol={currencySymbol} space={space} />
      ) : null}
      {space.kind === SpaceKind.Railway ? (
        <RailwayDeed currencySymbol={currencySymbol} space={space} />
      ) : null}
      {space.kind === SpaceKind.Utility ? (
        <UtilityDeed currencySymbol={currencySymbol} space={space} />
      ) : null}

      <SpaceDescription currencySymbol={currencySymbol} space={space} />

      {actions ? <div className="space-card-actions">{actions}</div> : null}
    </div>
  );
}
