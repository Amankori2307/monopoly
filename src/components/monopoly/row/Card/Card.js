import { cardTypes } from '../../../../utility/constants'
import SiteOrRealmRailsOrUtilityCard from './SiteOrRealmRailsOrUtilityCard'
import SpecialCard from './SpecialCard'
import ChestOrChanceCard from './ChestOrChanceCard'
import TaxCard from './TaxCard'

const Card = ({onCardClick, data, rowNum, active, soldTo}) => {
    
    const genCard = () => {
        let UI = null;
        switch (data.type) {
            case cardTypes.SITE:
            case cardTypes.REALM_RAILS:
            case cardTypes.UTILITY:
                UI = <SiteOrRealmRailsOrUtilityCard data={data} rowNum={rowNum} onCardClick={onCardClick} active={active} soldTo={soldTo}/>
                break;
            case cardTypes.SPECIAL:
                UI = <SpecialCard rowNum={rowNum} active={active}/>
                break;
            case cardTypes.CHEST:
            case cardTypes.CHANCE:
                UI = <ChestOrChanceCard data={data} active={active}/>
                break;
            case cardTypes.TAX:
                UI = <TaxCard data={data} active={active} onCardClick={onCardClick}/>
                break;
            default:
                UI = null
                break;
        }
        return UI
    }

    return genCard();
}

export default Card