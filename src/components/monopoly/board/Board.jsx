import React from 'react';
import style from '../../../assets/css/board.module.scss'
import Row from '../row/Row';
import DiceContainer from "../dice/DiceContainer";
import PlayerContainer from '../player/PlayerContainer';
import { connect } from 'react-redux';
import PlayerDetailsContainer from '../player/PlayerDetailsContainer';
import Actions from '../modal/Actions';
import ActionInfo from '../action/ActionInfo';
import DoneButton from '../donebutton/DoneButton';

const Board = ({ side, totalPlayers, sites, active }) => {
    return (
        <>
            <div className={style.board} style={{ width: side + "px", height: side + "px" }} >
                {[
                    sites.slice(0, 10).reverse(),
                    sites.slice(10, 20).reverse(),
                    sites.slice(20, 30),
                    sites.slice(30, 40),
                ].map((data, index) => <Row key={index} data={data} rowNum={index + 1} />)}
                <DiceContainer />
                <DoneButton />
                <PlayerContainer totalPlayers={totalPlayers} />
                {active && <ActionInfo />}
            </div>
            <PlayerDetailsContainer />
            <Actions />
        </>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {

    }
}

const mapStateToProps = (store) => {
    return {
        side: store.board.side,
        totalPlayers: store.playersData.totalPlayers,
        sites: store.siteData.sites,
        active: store.actionData.active
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Board)