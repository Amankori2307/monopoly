import React from 'react';
import style from '../../../assets/css/board.module.css'
import Row from '../row/Row';
import boardData from '../../../assets/data/boardData.json'
import DiceContainer from "../dice/DiceContainer";
import PlayerContainer from '../player/PlayerContainer';
import { connect } from 'react-redux';

const Board = ({positions,  side, totalPlayers}) => {
   
    return (
            <div className={style.board} style={{width: side+"px", height: side+"px"}} >
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

    }
}

const mapStateToProps = (store) => {
    return {
        positions: store.board.positions,
        side: store.board.side,
        totalPlayers: store.playersData.totalPlayers,
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Board)