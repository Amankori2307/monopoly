import style from '../../assets/css/card-modal.module.css'
import { connect } from 'react-redux';
import {REALM_RAILS, SITE, UTILITY, CHANCE, CHEST, TAX, SPECIAL} from '../../utility/constants'

const CardModal = ({hideOnClick, onClick, currentCard: card}) => {
    const SITE_INFO = "if a player owns all the sites of any color group the rent is doubled on unimproved sites in that group."
    const UTILITY_INFO = [
        "If one \"Utility\" is owned rent is 4 times amount shown on dice.",
        "If both \"Utilities\" are owned rent is 10 times shown on dice."
    ]
        
    const renderUI = () => {
        let UI = null;
        switch(card.type){
            case SITE:
                UI = (
                    <div className={style.cardModal} onClick={onClick}>
                        <i className={`fas fa-times ${style.close}`} onClick={hideOnClick}></i>
                        <div className={style.card}>
                            <p className={`${style.name} ${card.color} ${"c-"+card.textColorOnShow}`}>{card.name}</p>                
                            <p className={`${style.rent}`}>RENT: ${card.rent}</p>
                            <table className={style.rentWithHouse}>                        
                                    {card.rentWithHouse.map((data, index) => <tr key={index}>
                                        <td className={style.text}>With {index+1} House</td>
                                        <td className={style.houseRent}>${data}</td>
                                    </tr>)}
                            </table>
                            <p className={style.mortgage}>Mortage Value ${card.mortgage}</p>
                            <p className={style.construction}>Construction ${card.construction} Each</p>
                            <p className={style.info}>{SITE_INFO}</p>
                        </div>
                    </div>
                )
                break;
            case REALM_RAILS:
                UI = (
                    <div className={style.cardModal} onClick={onClick}>
                        <i className={`fas fa-times ${style.close}`} onClick={hideOnClick}></i>
                        <div className={style.card}>
                            <p className={`${style.name} ${card.color} ${"c-"+card.textColorOnShow}`}>{card.name}</p>                
                            <table className={`${style.rentWithHouse}  ${style.mt}`}>                        
                                    {card.rent.map((data, index) => <tr key={index}>
                                        <td className={style.text}>Rent if owns {index+1} realm rail{index?"s":""}</td>
                                        <td className={style.houseRent}>${data}</td>
                                    </tr>)}
                            </table>
                            <p className={style.mortgage}>Mortage Value ${card.mortgage}</p>
                        </div>
                    </div>
                )
                break;
        
            case UTILITY:
                
                UI = (
                    <div className={style.cardModal} onClick={onClick}>
                        <i className={`fas fa-times ${style.close}`} onClick={hideOnClick}></i>
                        <div className={style.card}>
                            <p className={`${style.name} ${card.color} ${"c-"+card.textColorOnShow}`}>{card.name}</p>                
                            <div className={style.utilityInfo}>
                                {UTILITY_INFO.map((data, index) => <p key={index}>{data}</p>)}
                            </div>
                            <p className={style.mortgage}>Mortage Value ${card.mortgage}</p>
                        </div>
                    </div>
                )
                break;
            default:
                break;
        }
        return UI;
    }
    return (
        <>
            {renderUI()}
        </>
    ); 
}
const mapStateToProps = (store) => {
    return {
        currentCard: store.card.currentCard
    }
}

export default connect(mapStateToProps)(CardModal) 