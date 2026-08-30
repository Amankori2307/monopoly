import type { HoldingsSection } from '../../../domain/rules/holdings.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import { SpaceCard } from '../deed/SpaceCard';
import type { PlayerSummary } from '../panels/panels.interfaces';
import { SideDrawer } from './SideDrawer';

interface PlayerDetailDrawerProps {
  currencySymbol: string;
  onClose: () => void;
  sections: HoldingsSection[];
  summary: PlayerSummary | null;
}

/**
 * A player's full portfolio, opened from their card.
 *
 * Holdings are grouped by colour set - the grouping that actually matters in
 * Monopoly - with each site shown as its real title deed. Board position is
 * deliberately absent: it is a number nobody acts on.
 */
export function PlayerDetailDrawer({
  currencySymbol,
  onClose,
  sections,
  summary,
}: PlayerDetailDrawerProps) {
  if (!summary) {
    return null;
  }

  const { player, token, propertyCount, netWorth, mortgagedCount } = summary;

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

      {sections.length === 0 ? (
        <div className="empty-state">No owned assets yet.</div>
      ) : (
        sections.map((section) => (
          <section
            className="holdings-section"
            data-testid={scopedTestId(TEST_IDS.holdingsSection, section.id)}
            key={section.id}
          >
            {/* Sticky: a full deed is tall, so the group must stay identifiable. */}
            <header className="holdings-section-header">
              {section.colorGroup ? (
                <span
                  aria-hidden="true"
                  className={`holdings-swatch group-${section.colorGroup}`}
                />
              ) : null}
              <h3>{section.label}</h3>
              <span className="holdings-progress">
                {section.owned}/{section.total}
              </span>
              {section.isComplete ? (
                <span
                  className="holdings-monopoly"
                  data-testid={scopedTestId(TEST_IDS.holdingsMonopoly, section.id)}
                >
                  Monopoly
                </span>
              ) : null}
            </header>

            <div className="holdings-deeds">
              {section.spaces.map((space) => (
                <SpaceCard
                  currencySymbol={currencySymbol}
                  headingId={`holding-${space.id}`}
                  key={space.id}
                  space={space}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </SideDrawer>
  );
}
