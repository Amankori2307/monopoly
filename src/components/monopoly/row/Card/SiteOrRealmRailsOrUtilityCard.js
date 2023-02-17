import style from '../../../../assets/css/card.module.scss'
import { colors } from '../../../../utility/constants'
import HouseAndHotel from './HouseAndHotel'
import mortgagedIcon from '../../../../assets/images/mortgaged.svg'

const SiteOrRealmRailsOrUtilityCard = ({ data, rowNum, boughtBy, onCardClick, active }) => {
    const genClassList = () => {
        let classList = ""
        classList += style.card + " "
        classList += rowNum === 1 || rowNum === 2 ? style.reverse + " " : ""
        classList += (rowNum === 1 || rowNum === 2) && (boughtBy != null) ? `${style.sold} ${style.soldRev} ${style[colors[boughtBy]]} ` : ""
        classList += (rowNum === 3 || rowNum === 4) && (boughtBy != null) ? `${style.sold} ${style[colors[boughtBy]]} ` : ""
        classList += !active ? style.inactive + " " : ""
        return classList
    }
    return (
        <div className={genClassList()} onClick={onCardClick}>
            <div className={`${style.strip} ${data.color}`}>
                <HouseAndHotel built={data.built ? data.built : 0} oddRowNum={rowNum % 2 !== 0} />
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