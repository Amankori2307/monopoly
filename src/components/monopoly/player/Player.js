import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import style from '../../../assets/css/player.module.css'
import { connect } from 'react-redux'
import { movePlayer } from '../../../redux/actions/player'
import audio1 from '../../../assets/audio/playermove.wav'
import { setShowModal } from '../../../redux/actions/modal'
import { cardTypes } from '../../../utility/constants'
import { modalTypes } from '../../../utility/constants';
import { setIsDone } from '../../../redux/actions/board'
function Player({ playersData, diceSum, movePlayer, board, setDiceSumCalledCount, color, id, setShowModal, siteData, setIsDone }) {
    const isMounted = useRef(false)
    const firstRender = useRef(true)
    const currentPlayer = useRef(null)
    const positions = useRef(board.positions)
    const playerMoveAudio = useMemo(() => new Audio(audio1), [])
    const playerRef = useRef(null)
    const playersDataRef = useRef(playersData)
    const currentPlayerSite = playersData.players[id].site
    const siteDataRef = useRef(siteData)
    const [movedCount, setMovedCount] = useState(0)



    const checkIfLType = () => {
        let { previousSite: ps, site: cs } = currentPlayer.current
        if (ps < 10 && cs > 10) return 10;
        else if (ps < 20 && cs > 20) return 20;
        else if (ps < 30 && cs > 30) return 30;
        else if (ps >= 29 && ps <= 39 && cs > 0 && cs <= 11) return 0;
        else return null;
    }

    const calculatePlayersOnCurrentSite = (site) => {
        let players = playersDataRef.current.players;
        let playersOnCurrentSite = {
            playerIds: [],
            count: 0
        };
        for (let playerId = 0; playerId < playersDataRef.current.totalPlayers; playerId++) {
            if (players[playerId].site === site) {
                playersOnCurrentSite.count++;
                playersOnCurrentSite.playerIds.push(playerId)
            }
        }
        return playersOnCurrentSite;
    }
    const adjustHelper = useCallback((playersOnCurrentSite) => {
        let { count, playerIds } = playersOnCurrentSite;
        if (count > 0) {
            playerIds = playerIds.sort(function (a, b) {
                return a - b;
            })
            let idx = playerIds.indexOf(id)
            let gap = 10;
            return [(idx * gap) - (((count - 1) / 2) * gap), idx]
        } else {
            return [0, 1]
        }

    }, [id])

    const updatePostionDataAccoringToPlayersOnThatSite = useCallback((positionData) => {
        let site = positionData.site
        let playersOnCurrentSite = calculatePlayersOnCurrentSite(site)
        let [adjust, zIndex] = adjustHelper(playersOnCurrentSite)
        positionData.zIndex = zIndex
        if ((site >= 0 && site <= 9) || (site >= 20 && site <= 29)) {
            positionData.top -= adjust
            positionData.bottom += adjust
        }
        else if ((site >= 10 && site <= 19) || (site >= 30 && site <= 39)) {
            positionData.left -= adjust
            positionData.right += adjust

        }
        return positionData
    }, [adjustHelper])

    const setPlayerPosition = useCallback((site, playAudio) => {
        if (playAudio) {
            playerMoveAudio.load()
            playerMoveAudio.play()
        }
        let positionData = JSON.parse(JSON.stringify(positions.current[site]));
        positionData = updatePostionDataAccoringToPlayersOnThatSite(positionData)
        playerRef.current.style.zIndex = positionData.zIndex;
        playerRef.current.style.top = positionData.top != null ? positionData.top + "px" : "unset";
        playerRef.current.style.right = positionData.right != null ? positionData.right + "px" : "unset";
        playerRef.current.style.bottom = positionData.bottom != null ? positionData.bottom + "px" : "unset";
        playerRef.current.style.left = positionData.left != null ? positionData.left + "px" : "unset";
    }, [playerMoveAudio, updatePostionDataAccoringToPlayersOnThatSite])

    // To move player || set updated position data in store 
    useEffect(() => {
        if (isMounted.current && (playersDataRef.current.activePlayer === id)) {

            console.log("useEffect2 ID:" + id)
            let sum = diceSum + currentPlayer.current.site;
            let currentSite = sum < 40 ? sum : (sum - 40);
            let playerData = positions.current[currentSite]
            movePlayer(playerData)
            setMovedCount(setDiceSumCalledCount)
        }
    }, [diceSum, id, movePlayer, setDiceSumCalledCount, setShowModal, setMovedCount]) // Adding setDiceSum because if precious set dice sum is equal to current dice sum it does not re render

    // 
    const showAppropriateModalOrChangeActivePlayer = useCallback(() => {
        if (!firstRender.current) {
            let currentSiteId = currentPlayer.current.site
            let currentSite = siteDataRef.current.sites[currentSiteId]
            if ([cardTypes.SITE, cardTypes.REALM_RAILS, cardTypes.UTILITY].includes(currentSite.type)) {
                let money = playersDataRef.current.players[id].money
                if (siteDataRef.current.boughtSites.includes(currentSite.id)) { // check if site is already bought
                    // If site is already bought check if it is mortaged if not pay rent
                    setIsDone(true)
                } else {
                    if (currentSite.sellingPrice <= money) {
                        setShowModal(true, modalTypes.BUY_CARD)
                    } else {
                        setShowModal(true, modalTypes.AUCTION_CARD)
                    }
                }

            } else {
                // Check What action is required
                setIsDone(true)
            }
        } else {
            firstRender.current = false
        }
    }, [setIsDone, id, setShowModal])

    // To render player according to the data in store
    useEffect(() => {
        currentPlayer.current = playersData.players[id]
        // Called on mount || first render
        if (!isMounted.current || playersDataRef.current.activePlayer !== id) {
            setPlayerPosition(currentPlayer.current.site, isMounted.current)
            isMounted.current = true;
            console.log("useEffect1 onMount ID:" + id)
        }
        // Called every on time on player move
        else if (playersDataRef.current.activePlayer === id) {
            let isLtype = checkIfLType();
            if (isLtype != null) {
                setPlayerPosition(isLtype, isMounted.current)
                setTimeout(() => {
                    setPlayerPosition(currentPlayer.current.site, isMounted.current)
                }, 400)
            } else {
                setPlayerPosition(currentPlayer.current.site, isMounted.current)
            }
            console.log("useEffect1 onUpdate ID:" + id)
        }

    }, [playersData.players, currentPlayerSite, playerMoveAudio, id, setPlayerPosition, setIsDone,])


    useEffect(() => {
        if (isMounted.current) {
            showAppropriateModalOrChangeActivePlayer()
        }
    }, [movedCount, showAppropriateModalOrChangeActivePlayer])


    // To update playersDataRef
    useEffect(() => {
        siteDataRef.current = siteData
        playersDataRef.current = playersData
    }, [playersData, siteData])



    return (
        <div className={`${style.player} player-${color}`} ref={playerRef}>
            {id}
        </div>
    );

}
const mapStateToProps = (store) => {
    return {
        playersData: store.playersData,
        diceSum: store.dice.diceSum,
        setDiceSumCalledCount: store.dice.setDiceSumCalledCount,
        board: store.board,
        siteData: store.siteData,
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        movePlayer: (data) => dispatch(movePlayer(data)),
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        setIsDone: (isDone) => dispatch(setIsDone(isDone)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Player)