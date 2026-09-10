import type { StreetSpace } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import { HotelPiece, HousePiece } from '../board/BuildingPiece';
import { DeedPrimaryStats } from './DeedPrimaryStats';

interface StreetDeedProps {
  /** What stands on the site now, so the live rent row can be marked. */
  buildLevel?: number;
  currencySymbol: string;
  space: StreetSpace;
}

/**
 * One rent tier: what it is worth, and how many buildings buy it.
 *
 * `houses` is what the row DRAWS - 0 for the two unbuilt tiers, 1-4 for
 * houses, and `hotel` for the top of the ladder. `label` is what it SAYS, and
 * it is never dropped: the icons are decoration over it, not a replacement.
 */
interface RentRow {
  label: string;
  amount: number;
  houses: number | 'hotel';
}

/** Rent rows in board order. Kept as data so the markup stays a single loop. */
const rentRows = (space: StreetSpace): RentRow[] => [
  { label: 'Rent', amount: space.rents.baseRent, houses: 0 },
  { label: 'With whole color set', amount: space.rents.monopolyRent, houses: 0 },
  { label: 'With 1 house', amount: space.rents.with1House, houses: 1 },
  { label: 'With 2 houses', amount: space.rents.with2Houses, houses: 2 },
  { label: 'With 3 houses', amount: space.rents.with3Houses, houses: 3 },
  { label: 'With 4 houses', amount: space.rents.with4Houses, houses: 4 },
  { label: 'With hotel', amount: space.rents.withHotel, houses: 'hotel' },
];

/**
 * The two unbuilt tiers have no building to draw, so they keep a word - just a
 * shorter one. "Rent" against "Color set" is the one distinction on this card
 * that a picture cannot make.
 */
const SHORT_LABELS: Record<string, string> = {
  'With whole color set': 'Color set',
};

/**
 * What a tier costs, drawn.
 *
 * The same `HousePiece` and `HotelPiece` that stand on the board's colour
 * ribbons, so a house means the same thing on the deed as on the square. This
 * is what buys the card its width back: "With 3 houses" is the widest thing in
 * the schedule, and that width is what forced the rows to wrap and the card to
 * grow with them.
 *
 * **The full label is always in the DOM**, whatever is drawn over it. A rent
 * tier read aloud as "three" is not a rent tier, and the row is a `<dt>` whose
 * whole job is to say what its figure means.
 */
function RentTier({ row }: { row: RentRow }) {
  if (row.houses === 0) {
    return (
      <>
        <span className="visually-hidden">{row.label}</span>
        <span aria-hidden="true">{SHORT_LABELS[row.label] ?? row.label}</span>
      </>
    );
  }

  return (
    <>
      <span className="visually-hidden">{row.label}</span>
      <span aria-hidden="true" className="rent-tier">
        {row.houses === 'hotel' ? (
          <HotelPiece className="rent-tier-hotel" portrait={false} />
        ) : (
          Array.from({ length: row.houses }, (_, index) => (
            <HousePiece className="rent-tier-house" key={index} />
          ))
        )}
      </span>
    </>
  );
}

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
        {rentRows(space).map((row, index) => (
          <div
            aria-current={index === currentRow ? 'true' : undefined}
            className={index === currentRow ? 'is-current-rent' : undefined}
            key={row.label}
          >
            <dt>
              <RentTier row={row} />
            </dt>
            <dd>{formatMoney(row.amount, currencySymbol)}</dd>
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
