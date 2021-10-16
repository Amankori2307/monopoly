import Player from "./Player"
import {colors} from "../../../utility/constants";
const PlayerContainer = ({totalPlayers}) => {
    return (
        <div className="playerContainer">
            {Array(totalPlayers).fill(0).map((data, idx) => <Player key={idx} currentPlayerId={idx} color={colors[idx]}/>)}
        </div>
    );
}
export default PlayerContainer