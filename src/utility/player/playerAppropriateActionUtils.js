export const appropriateActionHelper = useCallback(() => {
    let currentSiteId = currentPlayer.current.site
    let currentSite = siteDataRef.current.sites[currentSiteId]
    let {site: cs, previousSite: ps} = currentPlayer.current;
    if ([cardTypes.SITE, cardTypes.REALM_RAILS, cardTypes.UTILITY].includes(currentSite.type)) {
        let money = playersDataRef.current.players[id].money
        if (siteDataRef.current.boughtSites.includes(currentSite.id)) { // check if site is already bought
            // If site is already bought check if it is mortaged and who owns it if some other user owns it pay rent
            let boughtBy = siteDataRef.current.boughtBy[currentSiteId]
            console.log(`"${currentSite.name}" belongs to Player${boughtBy}`)
            if(!currentSite.isMortgaged && boughtBy !== id){
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
        }else{
            setIsDone(true)
        }
    } else if (currentSite.type === cardTypes.TAX) {
        debitPlayerMoney(id, currentSite.debit)
        setIsDone(true)
    } else {    
        setIsDone(true)
    }
    // Check if user crossed start(siteId === 0), if YES then add $200 credit 
    if(ps <= 39 && cs >= 0 && ps > cs && currentPlayer.current.direction === directions.FORWARD ) creditPlayerMoney(id, 200)
}, [creditPlayerMoney, debitPlayerMoney, diceSum, id, movePlayer, noOfCardsInCategory, setIsDone, setShowModal])
