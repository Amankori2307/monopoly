import style from '../../assets/css/card.module.css'

const SPECIAL = "special"
const SITE = "site"
const CHANCE = "chance"
const CHEST = "chest"

const Card = ({data, rowNum}) => {

    const genClassList = () => {
        let classList = "";
        classList += data.type === SPECIAL? style.special+" ": "";
        classList += rowNum === 2 || rowNum ===3? style.rowReverse+" ": ""
        return classList
    }
    return (

        <div className={`${style.card} ${genClassList()}`}>
            <div className={data.type===SITE? `${style.type} ${data.color}`: ""}></div>
            <div className={style.details}>
                <p className={style.name}>{data.name}</p>
                <p className={style.sellingPrice}>{data.currency}{data.sellingPrice}</p>
            </div>
        </div>
    );
}

export default Card