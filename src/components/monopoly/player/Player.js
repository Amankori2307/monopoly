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

function Player({ playersData, diceSum, movePlayer, board, setDiceSumCalledCount, color, id, setShowModal, siteData, setIsDone, debitPlayerMoney, creditPlayerMoney, setIsMoving, noOfCardsInCategory }) {
    const isMounted = useRef(false)
    const currentPlayer = useRef(null)
    const positions = useRef(board.positions)
    const playerMoveAudio = useMemo(() => new Audio(audio1), [])
    const playerRef = useRef(null)
    const playersDataRef = useRef(playersData)
    const siteDataRef = useRef(siteData)
    const isMoving = playersData.players[id].isMoving


    // To show appropriate modal or do appropriate action
    const appropriateAction = useCallback(() => {
        let currentSiteId = currentPlayer.current.site
        let currentSite = siteDataRef.current.sites[currentSiteId]
        let { site: cs, previousSite: ps } = currentPlayer.current;
        if ([cardTypes.SITE, cardTypes.REALM_RAILS, cardTypes.UTILITY].includes(currentSite.type)) {
            let money = playersDataRef.current.players[id].money
            if (siteDataRef.current.boughtSites.includes(currentSite.id)) { // check if site is already bought
                // If site is already bought check if it is mortaged and who owns it if some other user owns it pay rent
                let boughtBy = siteDataRef.current.boughtBy[currentSiteId]
                console.log(`"${currentSite.name}" belongs to Player${boughtBy}`)
                if (!currentSite.isMortgaged && boughtBy !== id) {
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
            // If current site is jail
            if (currentSite.id === 10) {
                debitPlayerMoney(id, 100);
                setIsDone(true);
            } else if (currentSite.id === 30) {
                movePlayer(id, 10, directions.BACKWARD)
            } else {
                setIsDone(true)
            }
        } else if (currentSite.type === cardTypes.TAX) {
            debitPlayerMoney(id, currentSite.debit)
            setIsDone(true)
        } else {
            setIsDone(true)
        }
        // Check if user crossed start(siteId === 0), if YES then add $200 credit 
        if (ps <= 39 && cs >= 0 && ps > cs && currentPlayer.current.direction === directions.FORWARD) creditPlayerMoney(id, 200)

    }, [creditPlayerMoney, debitPlayerMoney, diceSum, id, movePlayer, noOfCardsInCategory, setIsDone, setShowModal])

    // To move player when there are multple turns
    const setPlayerPositionRecursive = useCallback(async (turningPoints) => {
        setPlayerPositionRecursiveHelper(turningPoints, currentPlayer.current.site, positions.current, playersDataRef.current.players, playersDataRef.current.totalPlayers, id, playerRef.current, playerMoveAudio, isMounted.current, setIsMoving)
    }, [setIsMoving, id, playerMoveAudio])

    // Update active players position in redux on dice roll
    useEffect(() => {
        if (isMounted.current && (playersDataRef.current.activePlayer === id)) {
            console.log("useEffect1 ID(Update activePlayer postion in redux) Player" + id)
            let currentSite = (currentPlayer.current.site + diceSum) % 40
            movePlayer(id, currentSite, directions.FORWARD)
        }
    }, [diceSum, id, movePlayer, setDiceSumCalledCount]) // Adding 'setDiceSumCalledCount' because if previous 'diceSUm' is equal to current 'diceSum' it does not get called

    // To move player(actually move player on board in UI[Brower Window])
    useEffect(() => {
        if (isMoving || isMounted.current === false) {
            currentPlayer.current = playersDataRef.current.players[id]
            let turningPoints = getAllTurningPoints(currentPlayer.current.previousSite, currentPlayer.current.site, currentPlayer.current.direction);
            setPlayerPositionRecursive(turningPoints)
            console.log(`useEffect2(Move Player In UI) Player${id}`)
        }
    }, [setPlayerPositionRecursive, id, isMoving])

    // Show Appropriate modal or do appropriate action
    useEffect(() => {
        if (isMounted.current && isMoving === false && (playersDataRef.current.activePlayer === id)) {
            console.log(`useEffect3(Appropriate action) Player${id}`)
            appropriateAction()
        } else if (isMounted.current === false) {
            isMounted.current = true;
        }
    }, [isMoving, appropriateAction, id])

    // To update playersDataRef and siteDateRef
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