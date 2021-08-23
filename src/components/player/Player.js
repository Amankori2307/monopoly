import { useEffect } from 'react';
import style from '../../assets/css/player.module.css'
import {connect} from 'react-redux'
function Player({player, dice}){
    useEffect(() => {
        console.log(dice)
    })
    return (
        <div className={`${style.player} red`}>

        </div>
    );
}
const mapStateToProps = (store) => {
    return {
        player: store.player,
        dice: store.dice
    }
}

export default connect(mapStateToProps)(Player)