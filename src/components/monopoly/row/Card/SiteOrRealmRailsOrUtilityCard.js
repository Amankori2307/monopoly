import style from '../../../../assets/css/card.module.css'
import {colors} from '../../../../utility/constants'
import HouseAndHotel from './HouseAndHotel'
import mortgagedIcon from '../../../../assets/images/mortgaged.svg'

const SiteOrRealmRailsOrUtilityCard = ({data, rowNum, soldTo, onCardClick, active}) => {
    const genClassList = () => {
        let classList = ""
        classList += style.card + " "
        classList += rowNum === 1 || rowNum === 2 ? style.reverse + " " : ""
        classList += (rowNum === 1 || rowNum === 2) && (soldTo != null) ? `${style.sold} ${style.soldRev} ${style[colors[soldTo]]} ` : ""
        classList += (rowNum === 3 || rowNum === 4) && (soldTo != null) ? `${style.sold} ${style[colors[soldTo]]} ` : ""
        classList += !active ? style.inactive + " " : ""
        return classList
    }
    return (
        <div className={genClassList()} onClick={onCardClick}>
            <div className={`${style.strip} ${data.color}`}>
                <HouseAndHotel built={data.built ? data.built : 0} odd={rowNum % 2 !== 0} />
            </div>
            <div className={style.details}>
                <p className={style.sellingPrice}>${data.sellingPrice}</p>
                <p className={style.name}>{data.name}</p>
            </div>
            {data.isMortgaged && <img className={style.mortgaged} src={mortgagedIcon} alt="mortgaged" />}
        </div>
    );
}

export default SiteOrRealmRailsOrUtilityCard