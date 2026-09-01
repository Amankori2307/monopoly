import type { StreetSpace } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import { DeedPrimaryStats } from './DeedPrimaryStats';

interface StreetDeedProps {
  /** What stands on the site now, so the live rent row can be marked. */
  buildLevel?: number;
  currencySymbol: string;
  space: StreetSpace;
}

/** Rent rows in board order. Kept as data so the markup stays a single loop. */
const rentRows = (space: StreetSpace): Array<[string, number]> => [
  ['Rent', space.rents.baseRent],
  ['With whole colour set', space.rents.monopolyRent],
  ['With 1 house', space.rents.with1House],
  ['With 2 houses', space.rents.with2Houses],
  ['With 3 houses', space.rents.with3Houses],
  ['With 4 houses', space.rents.with4Houses],
  ['With hotel', space.rents.withHotel],
];

export function StreetDeed({ buildLevel = 0, currencySymbol, space }: StreetDeedProps) {
  // Row 0 and 1 are the unbuilt rents, and the deed cannot tell which of the
  // two applies without knowing who owns the rest of the set - so only built
  // sites get a marked row.
  const currentRow = buildLevel > 0 ? buildLevel + 1 : -1;

  return (
    <>
      <DeedPrimaryStats
        currencySymbol={currencySymbol}
        mortgageValue={space.mortgageValue}
        price={space.price}
      />
      <p className="deed-rent-title">Rent schedule</p>
      <dl className="rent-schedule" data-testid={TEST_IDS.rentSchedule}>
        {rentRows(space).map(([label, amount], index) => (
          <div
            aria-current={index === currentRow ? 'true' : undefined}
            className={index === currentRow ? 'is-current-rent' : undefined}
            key={label}
          >
            <dt>{label}</dt>
            <dd>{formatMoney(amount, currencySymbol)}</dd>
          </div>
        ))}
      </dl>
      <div className="deed-footer">
        Houses: {formatMoney(space.houseCost, currencySymbol)} each
        <span>Hotels: {formatMoney(space.hotelCost, currencySymbol)} each</span>
      </div>
    </>
  );
}
