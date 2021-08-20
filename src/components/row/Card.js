import style from '../../assets/css/card.module.css'
import {connect} from 'react-redux'
import {setShowModal, setCurrentCard} from '../../redux/actions/card'
import {REALM_RAILS, SITE, UTILITY, CHANCE, CHEST, TAX, SPECIAL} from '../../utility/constants'


const Card = ({data, rowNum, setShowModal, setCurrentCard}) => {
    const genClassList = () => {
        let classList = "";
        classList += rowNum === 1 || rowNum ===2? style.reverse+" ": ""
        return classList
    }
    const onCardClick = () => {
        setShowModal(true)
        setCurrentCard(data)
    }

    const genCard = () => {
        let UI = null;
        switch(data.type){
            case SITE:
            case REALM_RAILS:
            case UTILITY:
                UI = (
                    <div className={`${style.card} ${genClassList()}`} onClick={onCardClick}>
                        <div className={`${style.strip} ${data.color}`}></div>
                        <div className={style.details}>
                            <p className={style.sellingPrice}>${data.sellingPrice}</p>
                            <p className={style.name}>{data.name}</p>
                        </div>
                    </div>
                );
                break;
            case SPECIAL:
                UI = (
                    <div className={`${style.specialCard} ${rowNum === 1 || rowNum === 2? style.reverseSpecialCard: ""}`}>
                        <p>{data.name}</p>
                    </div>
                );
                break;
            case CHEST:
            case CHANCE:
                UI = (
                    <div className={`${style.card} ${style.chest} ${genClassList()}`}>
                        
                        <p>{data.name}</p>
                    </div>
                );
                break;
            case TAX:
                UI = (
                    <div className={`${style.card} ${genClassList()}`}>
                        <div className={style.details}>
                            <p className={style.debit}>Pay ${data.debit}</p>
                            <p className={style.name}>{data.name}</p>
                        </div>
                    </div>
                );
                break;
            default:
                UI = null
                break;
        }
        return UI        
    }

    return (
        <>
            {genCard()}
        </>
    );
}
// const mapStateToProps =  (store) => {
//     return {

//     }
// }
const mapDispatchToProps = (dispatch) => {
    return {
        setShowModal: (payload) => dispatch(setShowModal(payload)),
        setCurrentCard: (cardData) => dispatch(setCurrentCard(cardData)),
    }
}
export default connect(null, mapDispatchToProps)(Card) 