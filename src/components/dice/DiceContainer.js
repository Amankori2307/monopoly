import Dice from './Dice'
import style from '../../assets/css/dice.module.css'
import { useState } from 'react'
const DiceContainer = ()=>{
   
    const [number, setNumber] = useState({
        dice1: 6,
        dice2: 6
    })
    const genNumber = () => {
        return Math.floor(Math.random()*6) + 1
    }
    const rollDice = () =>{
        let num1 =  genNumber() 
        let num2 = genNumber()
        setNumber({
            dice1: num1,
            dice2: num2
        })
    }
    const onClick = () => {
        let interval = setInterval(rollDice, 50)
        setTimeout(() => {
            clearInterval(interval)
        }, 500)
    }
    return (
        <div className={style.diceContainer} onClick={onClick}>
            <Dice number={number.dice1}/>
            <Dice number={number.dice2}/>
        </div>
    );
}

export default DiceContainer