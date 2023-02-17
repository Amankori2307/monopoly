import style from '../../../assets/css/card-modal.module.scss'
import { connect } from 'react-redux';
import { cardTypes } from '../../../utility/constants'
import mortgagedIcon from '../../../assets/images/mortgaged.svg'

const CardModal = ({ card }) => {
    const SITE_INFO = "if a player owns all the sites of any color group the rent is doubled on unimproved sites in that group."
    const UTILITY_INFO = [
        "If one \"Utility\" is owned rent is 4 times amount shown on dice.",
        "If both \"Utilities\" are owned rent is 10 times shown on dice."
    ]

    const renderUI = () => {
        let UI = null;
        switch (card.type) {
            case cardTypes.SITE:
                UI = (
                    <div className={style.card}>
                        <p className={`${style.name} ${card.color} ${"c-" + card.textColorOnShow}`}>{card.name}</p>
                        <p className={`${style.rent}`}>RENT: ${card.rent}</p>
                        <table className={style.rentWithHouse}>
                            <tbody>
                                {card.rentWithHouse.map((data, index) => <tr key={index}>
                                    <td className={style.text}>With {index + 1} House</td>
                                    <td className={style.houseRent}>${data}</td>
                                </tr>)}
                            </tbody>
                        </table>
                        <p className={style.mortgage}>Mortage Value ${card.mortgage}</p>
                        <p className={style.construction}>Construction ${card.construction} Each</p>
                        <p className={style.info}>{SITE_INFO}</p>
                        {card.isMortgaged && <img src={mortgagedIcon} className={style.mortgageIcon} alt="mortgaged icon" />}
                    </div>
                )
                break;
            case cardTypes.REALM_RAILS:
                UI = (
                    <div className={style.card}>
                        <p className={`${style.name} ${card.color} ${"c-" + card.textColorOnShow}`}>{card.name}</p>
                        <table className={`${style.rentWithHouse}  ${style.mt}`}>
                            <tbody>
                                {card.rent.map((data, index) => <tr key={index}>
                                    <td className={style.text}>Rent if owns {index + 1} realm rail{index ? "s" : ""}</td>
                                    <td className={style.houseRent}>${data}</td>
                                </tr>)}
                            </tbody>
                        </table>
                        <p className={style.mortgage}>Mortage Value ${card.mortgage}</p>
                        {card.isMortgaged && <img src={mortgagedIcon} className={style.mortgageIcon} alt="mortgaged icon" />}
                    </div>
                )
                break;

            case cardTypes.UTILITY:
                UI = (
                    <div className={style.card}>
                        <p className={`${style.name} ${card.color} ${"c-" + card.textColorOnShow}`}>{card.name}</p>
                        <div className={style.utilityInfo}>
                            {UTILITY_INFO.map((data, index) => <p key={index}>{data}</p>)}
                        </div>
                        <p className={style.mortgage}>Mortage Value ${card.mortgage}</p>
                        {card.isMortgaged && <img src={mortgagedIcon} className={style.mortgageIcon} alt="mortgaged icon" />}
                    </div>
                )
                break;

            case cardTypes.TAX:
                UI = (
                    <div className={`${style.card} ${style.centerWrapper} ${style.radialBackground}`}>
                        <div className={`${style.circle} ${style.centerWrapper} ${style.column}`}>
                            <p className={style.heading}>Pay ${card.debit}</p>
                            <p className={style.subHeading}>{card.name}</p>
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
    }
}

export default connect(mapStateToProps)(CardModal) 