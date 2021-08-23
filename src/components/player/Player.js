import { useEffect } from 'react';
import style from '../../assets/css/player.module.css'
import {connect} from 'react-redux'
function Player({player}){
    useEffect(() => {
        console.log(player)
    })
    return (
        <div className={`${style.player} red`}>

        </div>
    );
}
const mapStateToProps = (store) => {
    return {
        player: store.player
    }
}

export default connect(mapStateToProps)(Player)