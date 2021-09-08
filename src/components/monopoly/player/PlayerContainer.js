import Player from "./Player"
import colors from "../../../utility/colors";
const PlayerContainer = ({totalPlayers}) => {
    return (
        <div className="playerContainer">
            {Array(totalPlayers).fill(0).map((data, idx) => <Player key={idx} id={idx} color={colors[idx]}/>)}
        </div>
    );
}
export default PlayerContainer