import { data } from 'jquery';
import style from '../../assets/css/card-modal.module.css'
import { connect } from 'react-redux';

const CardModal = ({hideOnClick, onClick, currentCard: card}) => {
    const info = "if a player owns all the sites of any color group the rent is doubled on unimproved sites in that group."
    return (
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
                <p className={style.info}>{info}</p>
            </div>
        </div>
    ); 
}
const mapStateToProps = (store) => {
    return {
        currentCard: store.card.currentCard
    }
}

export default connect(mapStateToProps)(CardModal) 