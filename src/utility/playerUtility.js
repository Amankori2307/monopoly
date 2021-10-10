import { directions } from "./constants"

export const createPlayerData = (totalPlayers) => {
    let players = {}
    for(let player=0; player<totalPlayers; player++){
        players[player] = {
            site: 0,
            previousSite: 0,
            playerId: player,
            money: 1000,
            isMoving: false,
            direction: directions.FORWARD
        }
    }

    return players
}


export const calcTurningPoints = (ps, cs) => {
    let points = [0, 10, 20, 30]
    let turningPoints = []    
    for(let i=0; i<points.length; i++){
        if(ps < points[i] && cs > points[i]) turningPoints.push(points[i])
    }
    return turningPoints
}
export const checkIfLType = (ps, cs) => {
    let turningPoints = []
    if(ps < cs){
        turningPoints.push(...calcTurningPoints(ps, cs))
    }else if(ps > cs){
        turningPoints.push(...calcTurningPoints(ps, 39))
        if(cs !== 0) turningPoints.push(0)
        turningPoints.push(...calcTurningPoints(0, cs))
    }
    return turningPoints;
}

export const delay = millis => new Promise((resolve, reject) => {
    setTimeout(_ => resolve(), millis)
  });