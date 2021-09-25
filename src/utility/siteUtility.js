import { MAX_PLAYERS } from "./constants"

export const siteDataIntialPlayersSites = () => {
    let player = {}
    for(let i=0; i<MAX_PLAYERS; i++){
        player[i] = []
    }
    player[0] = [
        {
            "id":1,
            "type":"site",
            "color":"brown",
            "name":"Minish Woods",
            "sellingPrice":60,
            "textColorOnShow":"white",
            "rent":2,
            "mortgage":30,
            "construction":50,
            "rentWithHouse":[
               10,
               30,
               90,
               160,
               250
            ],
            "subType":"brown",
            "isMortgaged":false,
            "built":5
         },
         {
            "id":3,
            "type":"site",
            "color":"brown",
            "name":"Ordon Village",
            "sellingPrice":60,
            "textColorOnShow":"white",
            "rent":4,
            "mortgage":30,
            "construction":50,
            "rentWithHouse":[
               20,
               60,
               180,
               320,
               450
            ],
            "subType":"brown",
            "isMortgaged":false,
            "built":5
         },
       
    ]
  
    return player
}
