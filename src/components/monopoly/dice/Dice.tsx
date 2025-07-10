import style from '../../../assets/css/dice.module.scss'

const Dice = ({ number }) => {
    return (
        <div className={style.dice}>
            {number}
        </div>
    );
}
export default Dice