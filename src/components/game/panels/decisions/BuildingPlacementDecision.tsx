import type { SellableBuilding } from '../../../../domain/rules/buildings.utils';
import { BuildingKind } from '../../../../domain/types/game.enums';
import type { SpaceId } from '../../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';

interface BuildingPlacementDecisionProps {
  buildingKind: BuildingKind;
  currencySymbol: string;
  onChoose: (spaceId: SpaceId) => void;
  paidAmount: number;
  playerName: string;
  sites: SellableBuilding[];
}

/**
 * Where a building won at auction goes.
 *
 * The auction sells the building, not a site — so the winner picks from their
 * own eligible sites. Only sites the even rule allows are offered, which is why
 * this list can be shorter than everything they own.
 */
export function BuildingPlacementDecision({
  buildingKind,
  currencySymbol,
  onChoose,
  paidAmount,
  playerName,
  sites,
}: BuildingPlacementDecisionProps) {
  const isHotel = buildingKind === BuildingKind.Hotel;

  return (
    <div className="building-placement" data-testid={TEST_IDS.buildingPlacement}>
      <p className="eyebrow">Building auction</p>
      <h2>
        {playerName} won {isHotel ? 'a hotel' : 'a house'}
      </h2>
      <p className="building-placement-lede">
        Paid {formatMoney(paidAmount, currencySymbol)} to the Bank. Choose where it goes.
      </p>

      <ul className="liquidation-sites">
        {sites.map((site) => (
          <li key={site.spaceId}>
            <span>
              {site.name}
              {isHotel ? '' : ` — ${site.buildLevel} houses`}
            </span>
            <button
              className="secondary-button"
              data-testid={scopedTestId(TEST_IDS.buildingPlacementSite, site.spaceId)}
              onClick={() => onChoose(site.spaceId)}
              type="button"
            >
              Build here
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
