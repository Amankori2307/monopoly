import React, {useEffect, useState, useRef} from 'react';
import style from '../assets/css/board.module.css'
import Row from './row/Row';

const Board = () => {
    const boardRef = useRef(null)
    useEffect(() => {
        let w = window.innerWidth;
        let h = window.innerHeight;
        let side = (Math.min(w,h)-40)+"px"
        console.log(boardRef.current.style)
        console.log(side)
        boardRef.current.style.width = side;
        boardRef.current.style.height = side;
    }, [])
    return (
        <div className={style.board} ref={boardRef}>
            <Row right bottom horizontal/>
            <Row bottom left vertical/>
            <Row left top horizontal/>
            <Row top right vertical/>
        </div>
    );
}

export default Board