import { useState } from 'react'
import style from '../../assets/css/card.module.css'
import {connect} from 'react-redux'
import {setShowModal} from '../../redux/actions/card'
const SPECIAL = "special"
const SITE = "site"
const CHANCE = "chance"
const CHEST = "chest"
const TAX = "tax"
const STATION = "station"
const UTILITY = "utility"

const Card = ({data, rowNum, setShowModal}) => {
    const genClassList = () => {
        let classList = "";
        classList += rowNum === 1 || rowNum ===2? style.reverse+" ": ""
        return classList
    }

    const genCard = () => {
        let UI = null;
        switch(data.type){
            case SITE:
            case STATION:
            case UTILITY:
                UI = (
                    <div className={`${style.card} ${genClassList()}`} onClick={() => setShowModal(true)}>
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
        setShowModal: (payload) => dispatch(setShowModal(payload))
    }
}
export default connect(null, mapDispatchToProps)(Card) 