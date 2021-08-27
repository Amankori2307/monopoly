

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
    for(var site=0; site<10; site++){
        if(site === 0) side1 = Math.floor((firstSiteLength/2)-(playerSize/2))
        else  side1 =  Math.floor(firstSiteLength + (siteLength*(site-1)) + (siteLength /2) - (playerSize/2))

        side3 = boardSide - side1 - playerSize;
        calculatePositionsHelper(site, positions, side1, side2, side3, side4)
    }
    return positions
}