import { cardTypes } from "./constants"
export const isBuildable = (mySites, currentCard, noOfCardsInCategory) => {
    let _isActionable = false;
    if (currentCard.type === cardTypes.SITE) {
        let subType = currentCard.subType;
        let mySitesInGivenCategory = mySites.filter(item => item.subType === subType)
        if (mySitesInGivenCategory.length === noOfCardsInCategory[subType]) { // checking is all the sites of this subType belongs to the current user 
            let i = 0;
            for (; i < mySitesInGivenCategory.length; i++) { // checking if any site is mortgaged
                if (mySitesInGivenCategory[i].isMortgaged) break;
                if (currentCard.built > mySitesInGivenCategory[i].built) break;
                if (currentCard.built === 5) break;
            }
            if (i === noOfCardsInCategory[subType]) _isActionable = true;
        }
    }
    return _isActionable;
}


export const isSellable = (mySites, currentCard, noOfCardsInCategory) => {
    let _isActionable = false;
    if (currentCard.built) { // Check if any construction on the current site/card 
        let subType = currentCard.subType;
        let mySitesInGivenCategory = mySites.filter(item => item.subType === subType)
        let i = 0;
        for (; i < mySitesInGivenCategory.length; i++) { // checking if any site is mortgaged
            if (currentCard.built < mySitesInGivenCategory[i].built) break;
        }
        if (i === noOfCardsInCategory[subType]) _isActionable = true;
    }
    return _isActionable;
}