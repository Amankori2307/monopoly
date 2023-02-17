import style from '../../../../assets/css/card.module.scss'

const TaxCard = ({ data, active, onCardClick }) => {

    return (
        <div className={`${style.card} ${!active ? style.inactive : ""}`} onClick={onCardClick}>
            <div className={style.details}>
                <p className={style.debit}>Pay ${data.debit}</p>
                <p className={style.name}>{data.name}</p>
            </div>
        </div>
    );
}
export default TaxCard