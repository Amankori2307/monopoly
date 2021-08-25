import { useEffect, useRef, useMemo } from 'react';
import style from '../../assets/css/player.module.css'
import {connect} from 'react-redux'
import {movePlayer} from '../../redux/actions/player'
import audio1 from '../../assets/audio/playermove.wav'

function Player({player, diceSum, movePlayer, board, setDiceSumCalledCount, color}){
    const isMounted = useRef(false)
    const site = useRef(player.site)
    const positions = useRef(board.positions)
    const playerMoveAudio = useMemo(() => new Audio(audio1),[])

    const playerRef = useRef(null)

    useEffect(() => {
        if(isMounted.current){
            
            console.log("useEffect2")
            let sum = diceSum+site.current;
            let currentSite = sum<40?sum:(sum-40);
            let playerData = positions.current[currentSite]
            movePlayer(playerData)
        }
    }, [diceSum, movePlayer, setDiceSumCalledCount]) // Adding setDiceSum because if precious set dice sum is equal to current dice sum it does not re render

    useEffect(() => {
        // Check if it is going through site 1, 11, 21, 31
        const checkIfLType = () => {
            let {previousSite: ps, site: cs} = player
            if(ps < 11 && cs > 11) return 11;
            else if(ps < 21 && cs > 21) return 21;
            else if(ps < 31 && cs > 31) return 31;
            else if(ps >= 31 && ps <= 40 && cs > 1 && cs <=30) return 1;
            else return null;
        }
        const setPlayerPosition = (positionData, playAudio) => {
            if(playAudio){
                playerMoveAudio.load()
                playerMoveAudio.play()
            }

            playerRef.current.style.top = positionData.top != null? positionData.top +"px": "unset";
            playerRef.current.style.right = positionData.right != null? positionData.right +"px": "unset";
            playerRef.current.style.bottom = positionData.bottom != null? positionData.bottom +"px": "unset";
            playerRef.current.style.left = positionData.left != null? positionData.left +"px": "unset";
        }

        let isLtype = checkIfLType();
        if(isLtype){
            let tempPlayer = positions.current[isLtype]
            setPlayerPosition(tempPlayer, isMounted.current)
            setTimeout(() => {
                setPlayerPosition(player, isMounted.current)
            }, 400)
        }else{
            setPlayerPosition(player, isMounted.current)
        }
        
        site.current = player.site
        isMounted.current = true
        console.log("useEffect1")
    }, [player, playerMoveAudio])



    
    return (
        <div className={`${style.player} ${color}`} ref={playerRef}>
            
        </div>
    );
}
const mapStateToProps = (store) => {
    return {
        player: store.player,
        diceSum: store.dice.diceSum,
        setDiceSumCalledCount: store.dice.setDiceSumCalledCount,
        board: store.board
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        movePlayer: (data) => dispatch(movePlayer(data))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Player)