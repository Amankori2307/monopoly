import Player from "./Player"

const PlayerContainer = ({totalPlayers}) => {
    const colors = ['red', 'yellow', 'blue', 'green', 'orange', 'pink']
    return (
        <div className="playerContainer">
            {
                Array(totalPlayers).fill(0).map((data, idx) => <Player key={idx} id={idx} color={colors[idx]}/>)
            }
        </div>
    );
}
export default PlayerContainer