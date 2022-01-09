export const genCardList = (data) => {
    return  data.map(site => {
        return {
            site,
            "selected": false,
        }
    })
}

function genCardListToOfferHelper(list){
    let finalList = []
    for(let i = 0; i<list.length; i++){
        if(list[i].selected === true){
            finalList.push(list[i].site)
        }
    }
    return finalList
}
export const genCardListToOffer = (cardLists) => {
    return {
        recieving: genCardListToOfferHelper(cardLists.currentPlayer),
        sending: genCardListToOfferHelper(cardLists.otherPlayer),
    }
}