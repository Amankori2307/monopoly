import type { ReactNode } from 'react';
import { isOwnableSpace } from '../../../domain/rules/space.utils';
import { SpaceKind } from '../../../domain/types/game.enums';
import type { BoardSpace } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { getSpaceIcon } from '../spaceIcons.constants';
import { RailwayDeed } from './RailwayDeed';
import { SpaceDescription } from './SpaceDescription';
import { StreetDeed } from './StreetDeed';
import { UtilityDeed } from './UtilityDeed';

interface SpaceCardProps {
  /** Optional actions rendered under the deed, e.g. Buy / Decline. */
  actions?: ReactNode;
  currencySymbol: string;
  /** Id for the card's heading, so a dialog can point aria-labelledby at it. */
  headingId?: string;
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
export function SpaceCard({
  actions,
  currencySymbol,
  headingId = 'space-card-title',
  space,
}: SpaceCardProps) {
  const icon = getSpaceIcon(space);
  const title = space.kind === SpaceKind.Street ? 'Title deed' : 'Board space';
  // Every card is the same size; this only pins a deed's house/hotel footer to
  // the bottom of it. A Chance or tax card has no footer to pin.
  const isDeed = isOwnableSpace(space);

  return (
    <div
      className={`deed-card space-card-body ${isDeed ? 'is-deed' : ''}`}
      data-testid={TEST_IDS.spaceCard}
    >
      <p className="eyebrow">{title}</p>
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
