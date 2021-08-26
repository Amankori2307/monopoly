import { useEffect, useRef, useMemo, useCallback } from 'react';
import style from '../../assets/css/player.module.css'
import {connect} from 'react-redux'
import {movePlayer} from '../../redux/actions/player'
import audio1 from '../../assets/audio/playermove.wav'

function Player({playersData, diceSum, movePlayer, board, setDiceSumCalledCount, color, id}){
    const isMounted = useRef(false)
    const currentPlayer = useRef(null)
    const positions = useRef(board.positions)
    const playerMoveAudio = useMemo(() => new Audio(audio1),[])
    const playerRef = useRef(null)
    const playersDataRef = useRef(playersData)


    const checkIfLType = () => {
        let {previousSite: ps, site: cs} = currentPlayer.current
        if(ps < 11 && cs > 11) return 11;
        else if(ps < 21 && cs > 21) return 21;
        else if(ps < 31 && cs > 31) return 31;
        else if(ps >= 31 && ps <= 40 && cs > 1 && cs <=30) return 1;
        else return null;
    }
    
    const setPlayerPosition = useCallback((site, playAudio) => {
        if(playAudio){
            playerMoveAudio.load()
            playerMoveAudio.play()
        }
        console.log(site)
        let positionData = positions.current[site]
        
        playerRef.current.style.top = positionData.top != null? positionData.top +"px": "unset";
        playerRef.current.style.right = positionData.right != null? positionData.right +"px": "unset";
        playerRef.current.style.bottom = positionData.bottom != null? positionData.bottom +"px": "unset";
        playerRef.current.style.left = positionData.left != null? positionData.left +"px": "unset";
    },[playerMoveAudio])


    // To move player || set updated position data in store 
    useEffect(() => {
        if(isMounted.current && (playersDataRef.current.activePlayer === id)){
            
            console.log("useEffect2 "+id)
            let sum = diceSum+currentPlayer.current.site;
            let currentSite = sum<40?sum:(sum-40);
            let playerData = positions.current[currentSite]
            movePlayer(playerData)
        }
    }, [diceSum, movePlayer, setDiceSumCalledCount, id, playersDataRef.current.activePlayer]) // Adding setDiceSum because if precious set dice sum is equal to current dice sum it does not re render

    // To render player according to the data in store
    useEffect(() => {
        currentPlayer.current = playersData.players[playersData.activePlayer]
        if(!isMounted.current){
            setPlayerPosition(1, isMounted.current)
            isMounted.current = true
        }
        else if(playersData.activePlayer === id){
    
            // Check if it is going through site 1, 11, 21, 31
            let isLtype = checkIfLType();
            if(isLtype){
                setPlayerPosition(isLtype, isMounted.current)
                setTimeout(() => {
                    setPlayerPosition(currentPlayer.current.site, isMounted.current)
                }, 400)
            }else{
                setPlayerPosition(currentPlayer.current.site, isMounted.current)
            }
            
            console.log("useEffect1 "+id)
        }
    }, [playersData, playerMoveAudio, id, setPlayerPosition])



    
    return (
        <div className={`${style.player} ${color}`} ref={playerRef}>
            
        </div>
    );
}
const mapStateToProps = (store) => {
    return {
        playersData: store.playersData,
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