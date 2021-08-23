import Dice from './Dice'
import style from '../../assets/css/dice.module.css'
import { useState } from 'react'
import rollDiceAudio from '../../assets/audio/rolldice2.wav'
const DiceContainer = ()=>{
    const [disabled, setDisabled] = useState(false)
    const [number, setNumber] = useState({
        dice1: 6,
        dice2: 6
    })
    const audioElement = new Audio(rollDiceAudio)
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
        if(!disabled){
            setDisabled(true)
            let interval = setInterval(rollDice, 50)
            setTimeout(() => {
                clearInterval(interval)
                setDisabled(false)
            }, 500)
            audioElement.play()
        }        
    }
    return (
        <div className={style.diceContainer} onClick={onClick}>
            <Dice number={number.dice1}/>
            <Dice number={number.dice2}/>
        </div>
    );
}

export default DiceContainer