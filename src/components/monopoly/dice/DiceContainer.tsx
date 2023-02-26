import { IDiceState, rollDice } from '@monopoly/lib//core';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import rollDiceAudio from '../../../assets/audio/rolldice2.wav';
import style from '../../../assets/css/dice.module.scss';
import { IState } from '../../../redux/reducers/rootReducer';
import Dice from './Dice';
const DiceContainer = () => {
  const isDone = useSelector((state: IState) => state.board.isDone);
  const dispatch = useDispatch();
  const [disabled, setDisabled] = useState(false);
  const audioElement = new Audio(rollDiceAudio);
  const [number, setNumber] = useState({
    dice1: 6,
    dice2: 6,
  });
  const genNumber = () => {
    return Math.floor(Math.random() * 6) + 1;
  };
  const rollDiceHelper = () => {
    const num1 = genNumber();
    const num2 = genNumber();
    const diceData = {
      dice1: num1,
      dice2: num2,
    };
    // diceData.dice1 = 2
    // diceData.dice2 = 5
    setNumber(diceData);
    return diceData;
  };
  const onClick = () => {
    if (!disabled && !isDone) {
      setDisabled(true); // Disable Dice When Dice Is Rolling
      const interval = setInterval(rollDiceHelper, 50);
      setTimeout(() => {
        clearInterval(interval);
        const diceData = rollDiceHelper();
        dispatch(rollDice(diceData as IDiceState));
        setDisabled(false); // Enable Dice When Dice has finished Rolling
      }, 450);
      audioElement.play();
    }
  };
  return (
    <div
      className={`${style.diceContainer} ${isDone ? style.inactive : ''}`}
      onClick={onClick}
      data-testid="dice-container"
    >
      <Dice number={number.dice1} />
      <Dice number={number.dice2} />
    </div>
  );
};

export default DiceContainer;
