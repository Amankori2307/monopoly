import { useEffect, useRef, useMemo, useCallback } from 'react';
import style from '../../../assets/css/player.module.css'
import { connect } from 'react-redux'
import { creditPlayerMoney, debitPlayerMoney, movePlayer, setIsMoving } from '../../../redux/actions/player'
import audio1 from '../../../assets/audio/playermove.wav'
import { setShowModal } from '../../../redux/actions/modal'
import { cardTypes, directions, modalTypes } from '../../../utility/constants'
import * as board from '../../../redux/actions/board'
import { getAllTurningPoints, calcRent } from '../../../utility/playerUtility';
import { setPlayerPositionRecursiveHelper } from '../../../utility/player/playerPositionUtility';
import { checkIfUserCrossedStart, ifCurrentSiteIsOfSubTypeIsSPECIAL, ifCurrentSiteIsOfSubTypeIsTAX } from '../../../utility/player/playerAppropriateActionUtils';

function Player({ playersData, diceSum, movePlayer, board, setDiceSumCalledCount, color, currentPlayerId, setShowModal, siteData, setIsDone, debitPlayerMoney, creditPlayerMoney, setIsMoving, noOfCardsInCategory }) {
    const isMounted = useRef(false)
    const currentPlayer = useRef(null)
    const positions = useRef(board.positions)
    const playerMoveAudio = useMemo(() => new Audio(audio1), [])
    const playerRef = useRef(null)
    const playersDataRef = useRef(playersData)
    const siteDataRef = useRef(siteData)
    const isMoving = playersData.players[currentPlayerId].isMoving


    // To show appropriate modal or do appropriate action
    const appropriateAction = useCallback(() => {
        let currentSiteId = currentPlayer.current.site
        let currentSite = siteDataRef.current.sites[currentSiteId]
        let { site: cs, previousSite: ps } = currentPlayer.current;
        if ([cardTypes.SITE, cardTypes.REALM_RAILS, cardTypes.UTILITY].includes(currentSite.type)) {
            let money = playersDataRef.current.players[currentPlayerId].money
            if (siteDataRef.current.boughtSites.includes(currentSite.id)) { // check if site is already bought
                // If site is already bought check if it is mortaged and who owns it if some other user owns it pay rent
                let boughtBy = siteDataRef.current.boughtBy[currentSiteId]
                console.log(`"${currentSite.name}" belongs to Player${boughtBy}`)
                if (!currentSite.isMortgaged && boughtBy !== currentPlayerId) {
                    let rent = calcRent(currentSite, siteDataRef.current.playersSites[boughtBy], diceSum, noOfCardsInCategory);
                    debitPlayerMoney(playersDataRef.current.activePlayer, rent);
                    creditPlayerMoney(boughtBy, rent);
                }

                setIsDone(true)
            } else {
                if (currentSite.sellingPrice <= money) {
                    setShowModal(true, modalTypes.BUY_CARD)
                } else {
                    setShowModal(true, modalTypes.AUCTION_CARD)
                }
            }
        } else if (currentSite.type === cardTypes.SPECIAL) {
            ifCurrentSiteIsOfSubTypeIsSPECIAL(currentSiteId, currentPlayerId, debitPlayerMoney, setIsDone, movePlayer)
        } else if (currentSite.type === cardTypes.TAX) {
            ifCurrentSiteIsOfSubTypeIsTAX(currentSite, currentPlayerId, debitPlayerMoney, setIsDone)
        }
        checkIfUserCrossedStart(cs, ps, currentPlayer.current.direction, currentPlayerId, creditPlayerMoney)
    }, [creditPlayerMoney, debitPlayerMoney, diceSum, currentPlayerId, movePlayer, noOfCardsInCategory, setIsDone, setShowModal])

    // To move player when there are multple turns
    const setPlayerPositionRecursive = useCallback(async (turningPoints) => {
        setPlayerPositionRecursiveHelper(turningPoints, currentPlayer.current.site, positions.current, playersDataRef.current.players, playersDataRef.current.totalPlayers, currentPlayerId, playerRef.current, playerMoveAudio, isMounted.current, setIsMoving)
    }, [setIsMoving, currentPlayerId, playerMoveAudio])

    // Update active players position in redux on dice roll
    useEffect(() => {
        if (isMounted.current && (playersDataRef.current.activePlayer === currentPlayerId)) {
            console.log("useEffect1 ID(Update activePlayer postion in redux) Player" + currentPlayerId)
            let currentSite = (currentPlayer.current.site + diceSum) % 40
            movePlayer(currentPlayerId, currentSite, directions.FORWARD)
        }
    }, [diceSum, currentPlayerId, movePlayer, setDiceSumCalledCount]) // Adding 'setDiceSumCalledCount' because if previous 'diceSUm' is equal to current 'diceSum' it does not get called

    // To move player(actually move player on board in UI[Brower Window])
    useEffect(() => {
        if (isMoving || isMounted.current === false) {
            currentPlayer.current = playersDataRef.current.players[currentPlayerId]
            let turningPoints = getAllTurningPoints(currentPlayer.current.previousSite, currentPlayer.current.site, currentPlayer.current.direction);
            setPlayerPositionRecursive(turningPoints)
            console.log(`useEffect2(Move Player In UI) Player${currentPlayerId}`)
        }
    }, [setPlayerPositionRecursive, currentPlayerId, isMoving])

    // Show Appropriate modal or do appropriate action
    useEffect(() => {
        if (isMounted.current && isMoving === false && (playersDataRef.current.activePlayer === currentPlayerId)) {
            console.log(`useEffect3(Appropriate action) Player${currentPlayerId}`)
            appropriateAction()
        } else if (isMounted.current === false) {
            isMounted.current = true;
        }
    }, [isMoving, appropriateAction, currentPlayerId])

    // To update playersDataRef and siteDateRef
    useEffect(() => {
        siteDataRef.current = siteData
        playersDataRef.current = playersData
    }, [playersData, siteData])

    return (
        <div className={`${style.player} player-${color}`} ref={playerRef}>
            {currentPlayerId}
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
        noOfCardsInCategory: store.siteData.noOfCardsInCategory,
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        movePlayer: (playerId, currentSite, direction) => dispatch(movePlayer(playerId, currentSite, direction)),
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        setIsDone: (isDone) => dispatch(board.setIsDone(isDone)),
        debitPlayerMoney: (playerId, amount) => dispatch(debitPlayerMoney(playerId, amount)),
        creditPlayerMoney: (playerId, amount) => dispatch(creditPlayerMoney(playerId, amount)),
        setIsMoving: (playerId, isMoving) => dispatch(setIsMoving(playerId, isMoving)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Player)