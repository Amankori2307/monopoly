import type { BoardSpace } from '../../domain/types/game.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { useEscapeKey } from '../../shared/hooks/useEscapeKey';
import { SpaceCard } from './deed/SpaceCard';

interface SpaceDetailCardProps {
  currencySymbol: string;
  onClose: () => void;
  space: BoardSpace | null;
}

const HEADING_ID = 'space-detail-title';

/** Dismissible modal wrapper around the shared SpaceCard. */
export function SpaceDetailCard({
  currencySymbol,
  onClose,
  space,
}: SpaceDetailCardProps) {
  useEscapeKey(Boolean(space), onClose);

  if (!space) {
    return null;
  }

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
        aria-labelledby={HEADING_ID}
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

        <SpaceCard currencySymbol={currencySymbol} headingId={HEADING_ID} space={space} />
      </section>
    </div>
  );
}
