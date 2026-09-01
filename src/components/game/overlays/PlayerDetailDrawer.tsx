import { useEffect, useState } from 'react';
import type { HoldingsSection } from '../../../domain/rules/holdings.utils';
import type { OwnershipState, SpaceId } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import { SpaceCard } from '../deed/SpaceCard';
import type { PlayerSummary } from '../panels/panels.interfaces';
import { HoldingsStack } from './HoldingsStack';
import { SideDrawer } from './SideDrawer';

interface PlayerDetailDrawerProps {
  currencySymbol: string;
  onClose: () => void;
  /** Ownership by space, so a mortgaged holding is struck here as on the board. */
  ownership: Record<SpaceId, OwnershipState>;
  sections: HoldingsSection[];
  summary: PlayerSummary | null;
}

/**
 * A player's full portfolio, opened from their card.
 *
 * One holding is featured as a full title deed; the rest sit below in a single
 * stack showing only their titles, in colour-group order. Rendering every deed
 * in full made a large portfolio an unnavigable scroll - one card at a time is
 * how you actually read a hand.
 */
export function PlayerDetailDrawer({
  currencySymbol,
  onClose,
  ownership,
  sections,
  summary,
}: PlayerDetailDrawerProps) {
  const allSpaces = sections.flatMap((section) => section.spaces);
  const firstSpaceId = allSpaces[0]?.id ?? null;
  const [selectedSpaceId, setSelectedSpaceId] = useState<SpaceId | null>(firstSpaceId);

  // Feature the first holding whenever the drawer switches to another player.
  useEffect(() => {
    setSelectedSpaceId(firstSpaceId);
  }, [firstSpaceId]);

  if (!summary) {
    return null;
  }

  const { player, token, propertyCount, netWorth, mortgagedCount } = summary;
  const featured =
    allSpaces.find((space) => space.id === selectedSpaceId) ?? allSpaces[0] ?? null;

  return (
    <SideDrawer
      eyebrow="Player"
      isOpen
      onClose={onClose}
      testId={TEST_IDS.playerDetailDrawer}
      title={`${token?.emoji ?? ''} ${player.name}`.trim()}
      wide
    >
      <div className="drawer-stats">
        <span>
          Net worth<strong>{formatMoney(netWorth, currencySymbol)}</strong>
        </span>
        <span>
          Cash<strong>{formatMoney(player.cash, currencySymbol)}</strong>
        </span>
        <span>
          Sites<strong>{propertyCount}</strong>
        </span>
        <span>
          Mortgaged<strong>{mortgagedCount}</strong>
        </span>
      </div>

      {featured === null ? (
        <div className="empty-state">No owned assets yet.</div>
      ) : (
        <>
          <div className="holdings-featured" data-testid={TEST_IDS.holdingsFeatured}>
            <SpaceCard
              currencySymbol={currencySymbol}
              headingId="holdings-featured-title"
              ownership={ownership[featured.id]}
              space={featured}
            />
          </div>

          <HoldingsStack
            currencySymbol={currencySymbol}
            ownership={ownership}
            onSelect={setSelectedSpaceId}
            sections={sections}
            selectedSpaceId={featured.id}
          />
        </>
      )}
    </SideDrawer>
  );
}
