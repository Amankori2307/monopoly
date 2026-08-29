import { SpaceKind } from '../../domain/types/game.enums';
import type { BoardSpace } from '../../domain/types/game.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { useEscapeKey } from '../../shared/hooks/useEscapeKey';
import { RailwayDeed } from './deed/RailwayDeed';
import { SpaceDescription } from './deed/SpaceDescription';
import { StreetDeed } from './deed/StreetDeed';
import { UtilityDeed } from './deed/UtilityDeed';
import { getSpaceIcon } from './spaceIcons.constants';

interface SpaceDetailCardProps {
  currencySymbol: string;
  onClose: () => void;
  space: BoardSpace | null;
}

/** Modal shell. Each space kind renders its own body - see ./deed. */
export function SpaceDetailCard({
  currencySymbol,
  onClose,
  space,
}: SpaceDetailCardProps) {
  useEscapeKey(Boolean(space), onClose);

  if (!space) {
    return null;
  }

  const icon = getSpaceIcon(space);
  const title = space.kind === SpaceKind.Street ? 'Title deed' : 'Board space';

  return (
    <div
      className="space-detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby="space-detail-title"
        aria-modal="true"
        className={`space-detail-card detail-${space.kind}`}
        data-testid={TEST_IDS.spaceDetailCard}
        role="dialog"
      >
        <button
          aria-label="Close space details"
          className="space-detail-close"
          onClick={onClose}
          type="button"
        >
          x
        </button>

        <p className="eyebrow">{title}</p>
        <div className="space-detail-title-row">
          {icon ? (
            <img alt="" aria-hidden="true" className="space-detail-icon" src={icon} />
          ) : null}
          <h2 id="space-detail-title">{space.name}</h2>
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
      </section>
    </div>
  );
}
