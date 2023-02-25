import { cardTypes } from '../../../../utility/constants'
import SiteOrRealmRailsOrUtilityCard from './SiteOrRealmRailsOrUtilityCard'
import SpecialCard from './SpecialCard'
import ChestOrChanceCard from './ChestOrChanceCard'
import TaxCard from './TaxCard'

const Card = ({onCardClick, data, rowNum, active, boughtBy}) => {
    
    const genCard = () => {
        switch (data.type) {
            case cardTypes.SITE:
            case cardTypes.REALM_RAILS:
            case cardTypes.UTILITY:
                return <SiteOrRealmRailsOrUtilityCard data={data} rowNum={rowNum} onCardClick={onCardClick} active={active} boughtBy={boughtBy}/>
            case cardTypes.SPECIAL:
                return <SpecialCard rowNum={rowNum} active={active}/>
            case cardTypes.CHEST:
            case cardTypes.CHANCE:
                return <ChestOrChanceCard data={data} active={active}/>
            case cardTypes.TAX:
                return <TaxCard data={data} active={active} onCardClick={onCardClick}/>
            default:
                return null
        }
    }

    return genCard();
}

export default Card