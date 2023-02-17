import style from '../../../../assets/css/card.module.scss'
import startBG from '../../../../assets/images/start.png'
import jailBG from '../../../../assets/images/jail.png'
import resortBG from '../../../../assets/images/resort.png'
import goToJailBG from '../../../../assets/images/go-to-jail.png'

const SpecialCardBG = {
    1: startBG,
    2: jailBG,
    3: resortBG,
    4: goToJailBG
}


const SpecialCard = ({ rowNum, active }) => {
    const genClassList = () => {
        let classList = "";
        classList += style.specialCard + " "
        classList += rowNum === 1 || rowNum === 2 ? style.reverseSpecialCard + " " : ""
        classList += !active ? style.inactive + " " : ""
        return classList
    }

    return (
        <div className={genClassList()} style={{ backgroundImage: `url(${SpecialCardBG[rowNum]})` }}>
        </div>
    );
}

export default SpecialCard