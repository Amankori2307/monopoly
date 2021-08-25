

export const calculatePositionsHelper = (site, positions, side1, side2, side3, side4) => {
    positions[site] = {
        "right": side1,
        "bottom": side2,
        "left": side3,
        "top": side4,
        "site": site, 
    }
    positions[site+10] = {
        "bottom": side1,
        "left": side2,
        "top": side3,
        "right": side4,
        "site": site + 10,
    }
    positions[site+20] = {
        "left": side1,
        "top": side2,
        "right": side3,
        "bottom": side4,
        "site": site + 20,
    }
    
    positions[site+30] = {
        "top": side1,
        "right": side2,
        "bottom": side3,
        "left": side4,
        "site": site + 30,
    }
}

export const calculatePositions = (board) =>{
    let {side: boardSide, rowWidth} = board
    let rowLength = boardSide - rowWidth;
    let firstSiteLength = 120
    let totalSitesInRow = 10
    let siteLength = Math.floor((rowLength - firstSiteLength)/(totalSitesInRow-1))
    let playerSize = 30
    var side1 = null;
    var side2 = Math.floor((rowWidth/2)-(playerSize/2))
    var side3 = null
    var side4 = boardSide - side2 - playerSize  
    var positions = Array(41)
    for(var site=1; site<=10; site++){
        if(site === 1) side1 = Math.floor((firstSiteLength/2)-(playerSize/2))
        else  side1 =  Math.floor(firstSiteLength + (siteLength*(site-2)) + (siteLength /2) - (playerSize/2))
        // else side1 += siteLength

        side3 = boardSide - side1 - playerSize;
        calculatePositionsHelper(site, positions, side1, side2, side3, side4)
    }
    return positions
}






// const calculatePosition =  (site) => {
//     let rowPos = site%10 === 0? 10 : site%10;
//     let {side, rowWidth} = board
//     let rowLength = side - rowWidth;
//     let firstSiteLength = 120
//     let totalSitesInRow = 10
//     let siteLength = Math.floor((rowLength - firstSiteLength)/(totalSitesInRow-1))
//     let playerSize = 30
//     if(rowPos === 1){
//         return (firstSiteLength/2)-(playerSize/2)
//     }
//     else{
//         return firstSiteLength+(siteLength*(rowPos-2))+((siteLength/2) - (playerSize/2))
//     }
// }

// const calculatePositionAndSite = useCallback((currentSite, diceSum) => {
//     let site = currentSite + diceSum;
//     site = site <= 40? site : site-40;
//     let side = board.side
//     let playerSize = 30;
//     let playerData = {
//         top: null,
//         right: null,
//         bottom: null,
//         left: null,
//         site: site
//     }       
    
//     if( site <= 10){
//         playerData.right = calculatePosition(site)
//         playerData.bottom = 45
//         playerData.left = side - playerData.right - playerSize
//         playerData.top = side - playerData.bottom - playerSize
//     }else if( site <= 20){
//         playerData.bottom = calculatePosition(site)
//         playerData.left = 45
//         playerData.top = side - playerData.bottom - playerSize
//         playerData.right = side - playerData.left - playerSize
//     } else if( site <= 30){
//         playerData.left = calculatePosition(site)
//         playerData.top = 45
//         playerData.right = side - playerData.left - playerSize
//         playerData.bottom = side - playerData.top - playerSize
//     } else if( site <= 40){
//         playerData.top = calculatePosition(site)
//         playerData.right = 45
//         playerData.bottom = side - playerData.top - playerSize
//         playerData.left = side - playerData.right - playerSize 
//     } 
//     return playerData
// }, [calculatePosition, board.side])

