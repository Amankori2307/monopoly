import type { UtilitySpace } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { DeedPrimaryStats } from './DeedPrimaryStats';

interface UtilityDeedProps {
  currencySymbol: string;
  space: UtilitySpace;
}

export function UtilityDeed({ currencySymbol, space }: UtilityDeedProps) {
  return (
    <>
      <DeedPrimaryStats
        currencySymbol={currencySymbol}
        mortgageValue={space.mortgageValue}
        price={space.price}
      />
      <p className="detail-copy">Rent is based on the dice roll.</p>
      <dl className="rent-schedule" data-testid={TEST_IDS.rentSchedule}>
        <div>
          <dt>One utility owned</dt>
          <dd>{space.rentMultiplierOne}x dice</dd>
        </div>
        <div>
          <dt>Both utilities owned</dt>
          <dd>{space.rentMultiplierBoth}x dice</dd>
        </div>
      </dl>
    </>
  );
}
