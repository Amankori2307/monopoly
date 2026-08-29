import type { RailwaySpace } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import { DeedPrimaryStats } from './DeedPrimaryStats';

interface RailwayDeedProps {
  currencySymbol: string;
  space: RailwaySpace;
}

export function RailwayDeed({ currencySymbol, space }: RailwayDeedProps) {
  return (
    <>
      <DeedPrimaryStats
        currencySymbol={currencySymbol}
        mortgageValue={space.mortgageValue}
        price={space.price}
      />
      <p className="deed-rent-title">Rent by stations owned</p>
      <dl className="rent-schedule" data-testid={TEST_IDS.rentSchedule}>
        {space.rentByCount.map((rent, index) => (
          <div key={rent}>
            <dt>
              {index + 1} railway{index === 0 ? '' : 's'}
            </dt>
            <dd>{formatMoney(rent, currencySymbol)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
