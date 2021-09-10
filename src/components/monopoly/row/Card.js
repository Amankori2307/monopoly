import style from '../../../assets/css/card.module.css'
import {connect} from 'react-redux'
import {setCurrentCard} from '../../../redux/actions/card'
import {setShowModal} from '../../../redux/actions/modal'
import {REALM_RAILS, SITE, UTILITY, CHANCE, CHEST, TAX, SPECIAL} from '../../../utility/constants'
import modalTypes from '../../../utility/modalTypes'
import colors from '../../../utility/colors'

const Card = ({data, rowNum, setShowModal, setCurrentCard, soldTo}) => {
    const genClassList = () => {
        let classList = "";
        classList += rowNum === 1 || rowNum ===2? style.reverse+" ": ""
        classList += (rowNum === 1 || rowNum ===2) && (soldTo != null)? `${style.sold} ${style.soldRev} ${style[colors[soldTo]]} `: ""
        classList += (rowNum === 3 || rowNum ===4) && (soldTo != null)? `${style.sold} ${style[colors[soldTo]]} `: ""
        return classList
    }
    const onCardClick = () => {
        setShowModal(true, modalTypes.SHOW_CARD)
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
                    <div className={`${style.card} ${genClassList()}`} onClick={onCardClick}>
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
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        setCurrentCard: (cardData) => dispatch(setCurrentCard(cardData)),
    }
}
export default connect(null, mapDispatchToProps)(Card) 