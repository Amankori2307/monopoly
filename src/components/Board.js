import React, {useEffect, useRef} from 'react';
import style from '../assets/css/board.module.css'
import Row from './row/Row';
import boardData from '../assets/data/boardData.json'
import DiceContainer from "./dice/DiceContainer";
import PlayerContainer from './player/PlayerContainer';
import { connect } from 'react-redux';
import {setBoardSize, calculateSitePositions} from '../redux/actions/board'
import { setTotalPlayers } from '../redux/actions/player';

const Board = ({positions, setBoardSize, calculateSitePositions, setTotalPlayers}) => {
    const boardRef = useRef(null)
    const totalPlayers = 4
    useEffect(() => {
        let w = window.innerWidth;
        let h = window.innerHeight;
        let side = (Math.min(w,h)-40)
        let boardData = {
            side: side,
            rowWidth: 120
        }
        setBoardSize(boardData)
        calculateSitePositions(boardData)
        setTotalPlayers(totalPlayers)
        
        side += "px"
        boardRef.current.style.width = side;
        boardRef.current.style.height = side;
        console.log("Board UseEffect")
    }, [setBoardSize, calculateSitePositions, setTotalPlayers])

    return (
            <div className={style.board} ref={boardRef}>
                {positions.length &&
                    <>
                    {[
                        boardData.slice(0,10),
                        boardData.slice(10,20),
                        boardData.slice(20,30),
                        boardData.slice(30,40),
                    ].map((data, index) => <Row key={index} data={data} rowNum={index+1}/>)}
                    <DiceContainer />
                    <PlayerContainer totalPlayers={totalPlayers}/>
                    </>
                }
            </div>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
        setBoardSize: data => dispatch(setBoardSize(data)),
        calculateSitePositions: data => dispatch(calculateSitePositions(data)),
        setTotalPlayers: totalPlayers => dispatch(setTotalPlayers(totalPlayers)),
    }
}

const mapStateToProps = (store) => {
    return {
        positions: store.board.positions
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Board)