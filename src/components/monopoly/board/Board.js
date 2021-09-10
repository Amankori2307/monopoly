import React from 'react';
import style from '../../../assets/css/board.module.css'
import Row from '../row/Row';
import DiceContainer from "../dice/DiceContainer";
import PlayerContainer from '../player/PlayerContainer';
import { connect } from 'react-redux';
import PlayerDetailsContainer from '../player/PlayerDetailsContainer';

const Board = ({positions,  side, totalPlayers, sites}) => {
    return (
        <>
            <div className={style.board} style={{width: side+"px", height: side+"px"}} >
                {positions.length &&
                    <>
                    {[
                        sites.slice(0,10).reverse(),
                        sites.slice(10,20).reverse(),
                        sites.slice(20,30),
                        sites.slice(30,40),
                    ].map((data, index) => <Row key={index} data={data} rowNum={index+1}/>)}
                    <DiceContainer />
                    <PlayerContainer totalPlayers={totalPlayers}/>
                    </>
                }
            </div>
            <PlayerDetailsContainer />
        </>
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
        sites: store.siteData.sites
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Board)