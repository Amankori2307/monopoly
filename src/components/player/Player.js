import { useCallback, useEffect, useRef } from 'react';
import style from '../../assets/css/player.module.css'
import {connect} from 'react-redux'
import {movePlayer} from '../../redux/actions/player'
import audio1 from '../../assets/audio/playermove.wav'
function Player({player, diceSum, movePlayer, board, setDiceSumCalledCount}){
    const isMounted = useRef(false)
    const site = useRef(player.site)
    const playerMoveAudio = new Audio(audio1)



    const calculatePosition =  useCallback((site) => {
        let rowPos = site%10 === 0? 10 : site%10;
        let {side, rowWidth} = board
        let rowLength = side - rowWidth;
        let firstSiteLength = 120
        let totalSitesInRow = 10
        let siteLength = Math.floor((rowLength - firstSiteLength)/(totalSitesInRow-1))
        let playerSize = 30
        if(rowPos === 1){
            return (firstSiteLength/2)-(playerSize/2)
        }
        else{
            return firstSiteLength+(siteLength*(rowPos-2))+((siteLength/2) - (playerSize/2))
        }
    }, [board])

    const calculatePositionAndSite = useCallback((currentSite, diceSum) => {
        let site = currentSite + diceSum;
        site = site <= 40? site : site-40;
        let side = board.side
        let playerSize = 30;
        let playerData = {
            top: null,
            right: null,
            bottom: null,
            left: null,
            site: site
        }       
        
        if( site <= 10){
            playerData.right = calculatePosition(site)
            playerData.bottom = 45
            playerData.left = side - playerData.right - playerSize
            playerData.top = side - playerData.bottom - playerSize
        }else if( site <= 20){
            playerData.bottom = calculatePosition(site)
            playerData.left = 45
            playerData.top = side - playerData.bottom - playerSize
            playerData.right = side - playerData.left - playerSize
        } else if( site <= 30){
            playerData.left = calculatePosition(site)
            playerData.top = 45
            playerData.right = side - playerData.left - playerSize
            playerData.bottom = side - playerData.top - playerSize
        } else if( site <= 40){
            playerData.top = calculatePosition(site)
            playerData.right = 45
            playerData.bottom = side - playerData.top - playerSize
            playerData.left = side - playerData.right - playerSize 
        } 
        return playerData
    }, [calculatePosition, board.side])

    useEffect(() => {
        if(isMounted.current){
            
            console.log("useEffect2")
            let playerData = calculatePositionAndSite(site.current, diceSum)
            movePlayer(playerData)
        }
    }, [diceSum, site, movePlayer, setDiceSumCalledCount, board, calculatePosition, calculatePositionAndSite])



    useEffect(() => {
        // Check if it is going through site 1, 11, 21, 31
        const checkIfLType = () => {
            let {previousSite: ps, site: cs} = player
            // console.log(`PS: ${ps}, CS ${cs}`)
            if(ps < 11 && cs > 11) return 11;
            else if(ps < 21 && cs > 21) return 21;
            else if(ps < 31 && cs > 31) return 31;
            else if(ps >= 31 && ps <= 40 && cs > 1 && cs <=30) return 1;
            else return null;
        }
        const setPlayerPosition = (positionData) => {
            playerMoveAudio.load()
            playerMoveAudio.play()

            playerRef.current.style.top = positionData.top != null? positionData.top +"px": "unset";
            playerRef.current.style.right = positionData.right != null? positionData.right +"px": "unset";
            playerRef.current.style.bottom = positionData.bottom != null? positionData.bottom +"px": "unset";
            playerRef.current.style.left = positionData.left != null? positionData.left +"px": "unset";
            // console.log("SET PLAYER POSITION")
        }

        let isLtype = checkIfLType();
        // console.log(isLtype)
        if(isLtype){
            let tempPlayer = calculatePositionAndSite(isLtype, 0)
            playerMoveAudio.play()
            
            setPlayerPosition(tempPlayer)
            setTimeout(() => {
                // playerMoveAudio2.play()
                setPlayerPosition(player)
            }, 400)
        }else{
            setPlayerPosition(player)
        }
        
        site.current = player.site
        isMounted.current = true
        console.log("useEffect1")
    }, [player, calculatePositionAndSite])



    const playerRef = useRef(null)
    return (
        <div className={`${style.player} red`} ref={playerRef}>

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