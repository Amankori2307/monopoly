import type { HoldingsSection } from '../../../domain/rules/holdings.utils';
import type {
  OwnableSpace,
  OwnershipState,
  SpaceId,
} from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { SpaceCard } from '../deed/SpaceCard';

interface HoldingsStackProps {
  currencySymbol: string;
  onSelect: (spaceId: SpaceId) => void;
  /**
   * Ownership by space, so a mortgaged holding is struck in the stack too.
   * `HoldingsSection.spaces` carries no ownership, and without this the drawer
   * showed a player's own mortgaged sites as though they were clear.
   */
  ownership: Record<SpaceId, OwnershipState>;
  sections: HoldingsSection[];
  selectedSpaceId: SpaceId | null;
}

/**
 * Every holding below the featured card, as one stack of real title deeds.
 *
 * Each card is the same `SpaceCard` used everywhere else, clipped so only its
 * top - the eyebrow and name - shows, and tucked under the card above. The
 * cards stay in colour-group order, so the grouping reads without splitting the
 * stack into separate lists. Picking one promotes it to the featured card.
 */
export function HoldingsStack({
  currencySymbol,
  onSelect,
  ownership,
  sections,
  selectedSpaceId,
}: HoldingsStackProps) {
  const spaces = sections.flatMap((section) => section.spaces);

  if (spaces.length === 0) {
    return null;
  }

  return (
    <div className="holdings-stack" data-testid={TEST_IDS.holdingsStack}>
      {spaces.map((space) => (
        <StackedDeed
          currencySymbol={currencySymbol}
          isSelected={space.id === selectedSpaceId}
          key={space.id}
          onSelect={onSelect}
          ownership={ownership[space.id]}
          space={space}
        />
      ))}
    </div>
  );
}

interface StackedDeedProps {
  currencySymbol: string;
  isSelected: boolean;
  onSelect: (spaceId: SpaceId) => void;
  ownership: OwnershipState | undefined;
  space: OwnableSpace;
}

function StackedDeed({
  currencySymbol,
  isSelected,
  onSelect,
  ownership,
  space,
}: StackedDeedProps) {
  return (
    <article
      className={`holdings-stack-card ${isSelected ? 'is-selected' : ''}`}
      data-testid={scopedTestId(TEST_IDS.holdingsStackCard, space.id)}
    >
      {/* Overlay rather than wrapping the deed, so the card's own heading and
          content are not nested inside a button. */}
      <button
        aria-label={`Show ${space.name}`}
        aria-pressed={isSelected}
        className="holdings-stack-open"
        onClick={() => onSelect(space.id)}
        type="button"
      />
      <SpaceCard
        currencySymbol={currencySymbol}
        headingId={`holding-${space.id}`}
        ownership={ownership}
        space={space}
      />
    </article>
  );
}
