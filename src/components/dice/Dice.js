import style from '../../assets/css/dice.module.css'

const Dice = ({number}) => {
   console.log("DICE: ")
   console.log(number)
    return (
        <div className={style.dice}>
            {number}
        </div>
    );
}
export default Dice