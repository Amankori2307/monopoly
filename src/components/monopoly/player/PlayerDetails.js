import style from '../../../assets/css/player-details.module.css'
const PlayerDetails = ({player, active, color}) => {
    return (
        <div className={`${style.playerDetails} ${style[color]} ${active? style.active: ""}`}>
            <div className={style.header}>
                <p className={style.playerName}>Player {player.playerId}</p>
                <div className={style.overley}></div>
            </div>
            <div className={style.details}>
                <p className={style.playerMoney}><b>Money:</b> ${player.money}</p>
            </div>
        </div>
    );
}

export default PlayerDetails