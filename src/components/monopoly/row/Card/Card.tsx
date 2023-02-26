import { ISite } from 'lib/core/src/lib';
import { cardTypes } from '../../../../utility/constants';
import ChestOrChanceCard from './ChestOrChanceCard';
import SiteOrRealmRailsOrUtilityCard from './SiteOrRealmRailsOrUtilityCard';
import SpecialCard from './SpecialCard';
import TaxCard from './TaxCard';

interface CardPropsType {
  onCardClick: () => void;
  site: ISite;
  rowNum: number;
  active: boolean;
  boughtBy: number;
}

const Card = (props: CardPropsType) => {
  const { onCardClick, site, rowNum, active, boughtBy } = props;
  const genCard = () => {
    switch (site.type) {
      case cardTypes.SITE:
      case cardTypes.REALM_RAILS:
      case cardTypes.UTILITY:
        return (
          <SiteOrRealmRailsOrUtilityCard
            data={site}
            rowNum={rowNum}
            onCardClick={onCardClick}
            active={active}
            boughtBy={boughtBy}
          />
        );
      case cardTypes.SPECIAL:
        return <SpecialCard rowNum={rowNum} active={active} />;
      case cardTypes.CHEST:
      case cardTypes.CHANCE:
        return <ChestOrChanceCard data={site} active={active} />;
      case cardTypes.TAX:
        return (
          <TaxCard data={site} active={active} onCardClick={onCardClick} />
        );
      default:
        return null;
    }
  };

  return genCard();
};

export default Card;
