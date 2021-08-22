import { useState } from 'react';
import style from '../../assets/css/dice.module.css'

const Dice = ({number}) => {
   
    return (
        <div className={style.dice}>
            {number}
        </div>
    );
}
export default Dice