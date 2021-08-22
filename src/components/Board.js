import React, {useEffect, useRef} from 'react';
import style from '../assets/css/board.module.css'
import Row from './row/Row';
import boardData from '../assets/data/boardData.json'
import DiceContainer from "./dice/DiceContainer";

const Board = () => {
    const boardRef = useRef(null)
    useEffect(() => {
        let w = window.innerWidth;
        let h = window.innerHeight;
        let side = (Math.min(w,h)-40)+"px"
        boardRef.current.style.width = side;
        boardRef.current.style.height = side;
    }, [])
    return (
        <div className={style.board} ref={boardRef}>
            {[
                boardData.slice(0,10),
                boardData.slice(10,20),
                boardData.slice(20,30),
                boardData.slice(30,40),
            ].map((data, index) => <Row key={index} data={data} rowNum={index+1}/>)}
            <DiceContainer />
       
        </div>
    );
}

export default Board