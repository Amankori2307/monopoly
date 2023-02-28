import { CARD_TYPES, ISite } from 'lib/core/src/lib';
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
      case CARD_TYPES.SITE:
      case CARD_TYPES.REALM_RAILS:
      case CARD_TYPES.UTILITY:
        return (
          <SiteOrRealmRailsOrUtilityCard
            data={site}
            rowNum={rowNum}
            onCardClick={onCardClick}
            active={active}
            boughtBy={boughtBy}
          />
        );
      case CARD_TYPES.SPECIAL:
        return <SpecialCard rowNum={rowNum} active={active} />;
      case CARD_TYPES.CHEST:
      case CARD_TYPES.CHANCE:
        return <ChestOrChanceCard data={site} active={active} />;
      case CARD_TYPES.TAX:
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
