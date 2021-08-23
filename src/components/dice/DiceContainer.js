import Dice from './Dice'
import style from '../../assets/css/dice.module.css'
import { useState } from 'react'
import rollDiceAudio from '../../assets/audio/rolldice2.wav'
import {connect} from 'react-redux' 
import {rollDice} from '../../redux/actions/dice'
const DiceContainer = ({dice, rollDice})=>{
    const [disabled, setDisabled] = useState(false)
    const audioElement = new Audio(rollDiceAudio)
    const genNumber = () => {
        return Math.floor(Math.random()*6) + 1
    }
    const rollDiceHelper = () =>{
        let num1 =  genNumber() 
        let num2 = genNumber()
        rollDice({
            dice1: num1,
            dice2: num2
        })
    }
    const onClick = () => {
        if(!disabled){
            setDisabled(true)
            let interval = setInterval(rollDiceHelper, 50)
            setTimeout(() => {
                clearInterval(interval)
                setDisabled(false)
            }, 500)
            audioElement.play()
        }        
    }
    console.log(dice.dice1)
    return (
        <div className={style.diceContainer} onClick={onClick}>
            <Dice number={dice.dice1}/>
            <Dice number={dice.dice2}/>
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        dice: store.dice
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        rollDice: diceData => dispatch(rollDice(diceData)) 
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DiceContainer)