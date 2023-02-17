import Dice from './Dice'
import style from '../../../assets/css/dice.module.scss'
import { useState } from 'react'
import rollDiceAudio from '../../../assets/audio/rolldice2.wav'
import { connect } from 'react-redux'
import { rollDice } from '../../../redux/actions/dice'

const DiceContainer = ({ rollDice, isDone }) => {
    const [disabled, setDisabled] = useState(false)
    const audioElement = new Audio(rollDiceAudio)
    const [number, setNumber] = useState({
        dice1: 6,
        dice2: 6
    })
    const genNumber = () => {
        return Math.floor(Math.random() * 6) + 1
    }
    const rollDiceHelper = () => {
        let num1 = genNumber()
        let num2 = genNumber()
        let diceData = {
            dice1: num1,
            dice2: num2,
        }
        // diceData.dice1 = 2
        // diceData.dice2 = 5
        setNumber(diceData)
        return diceData
    }
    const onClick = () => {
        if (!disabled && !isDone) {
            setDisabled(true) // Disable Dice When Dice Is Rolling
            let interval = setInterval(rollDiceHelper, 50)
            setTimeout(() => {
                clearInterval(interval)
                let diceData = rollDiceHelper()
                rollDice(diceData)
                setDisabled(false) // Enable Dice When Dice has finished Rolling
            }, 450)
            audioElement.play()
        }
    }
    return (
        <div className={`${style.diceContainer} ${isDone ? style.inactive : ""}`} onClick={onClick} data-testid="dice-container">
            <Dice number={number.dice1} />
            <Dice number={number.dice2} />
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        isDone: store.board.isDone
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        rollDice: diceData => dispatch(rollDice(diceData)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DiceContainer)