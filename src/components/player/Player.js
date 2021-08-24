import { useEffect, useRef } from 'react';
import style from '../../assets/css/player.module.css'
import {connect} from 'react-redux'
import {movePlayer} from '../../redux/actions/player'

function Player({player, diceSum, movePlayer, board, setDiceSumCalledCount}){
    const isMounted = useRef(false)
    const site = useRef(player.site)




    useEffect(() => {
        if(isMounted.current){
            const calculatePosition = (site) => {
                let rowPos = site%10 === 0? 10 : site%10;
                let {side, rowWidth} = board
                let rowLength = side - rowWidth;
                let firstSiteLength = 120
                let totalSitesInRow = 10
                let siteLength = Math.floor((rowLength - firstSiteLength)/(totalSitesInRow-1))
                let playerSize = 30
                console.log(site)
                if(rowPos === 1){
                    return (firstSiteLength/2)-(playerSize/2)
                }
                else{
                    return firstSiteLength+(siteLength*(rowPos-2))+((siteLength/2) - (playerSize/2))
                }
            }
            const calculatePositionAndSite = (currentSite, diceSum) => {
                let site = currentSite + diceSum;
                site = site <= 40? site : site-40;
        
                let playerData = {
                    top: null,
                    right: null,
                    bottom: null,
                    left: null,
                    site: site
                }       
                console.log("SITE")
                console.log(site) 
                
                if( site <= 10){
                    playerData.right = calculatePosition(site)
                    playerData.bottom = 45
                }
                else if( site <= 20){
                    playerData.left = 45
                    playerData.bottom = calculatePosition(site)
                } 
                else if( site <= 30){
                    playerData.left = calculatePosition(site)
                    playerData.top = 45
                } 
                else if( site <= 40){
                    playerData.right = 45
                    playerData.top = calculatePosition(site)
                } 
                    
                
                return playerData
            }

            console.log("useEffect2")
            let playerData = calculatePositionAndSite(site.current, diceSum)
            console.log(site.current)
            movePlayer(playerData)
        }
    }, [diceSum, site, movePlayer, setDiceSumCalledCount, board])

    useEffect(() => {
        console.log("Player: ",)
        console.log(player)
        isMounted.current = true
        playerRef.current.style.top = player.top != null? player.top +"px": "unset";
        playerRef.current.style.right = player.right != null? player.right +"px": "unset";
        playerRef.current.style.bottom = player.bottom != null? player.bottom +"px": "unset";
        playerRef.current.style.left = player.left != null? player.left +"px": "unset";
        site.current = player.site
        console.log("useEffect1")
    }, [player])



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