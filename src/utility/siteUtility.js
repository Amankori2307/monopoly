import {MAX_PLAYERS} from "./constants"

export const siteDataIntialPlayersSites = () => {
    let player = {}
    for(let i=0; i<MAX_PLAYERS; i++){
        player[i] = []
    }
    player = {
      "0": [
        {
          "id": 6,
          "type": "site",
          "color": "green",
          "name": "Kokiri Forest",
          "sellingPrice": 100,
          "textColorOnShow": "black",
          "rent": 6,
          "rentWithHouse": [
            30,
            90,
            270,
            400,
            550
          ],
          "mortgage": 50,
          "construction": 50,
          "subType": "green",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 12,
          "type": "utility",
          "color": "lightgrey",
          "name": "Windmill Hut",
          "sellingPrice": 150,
          "subType": "utility",
          "isMortgaged": false
        },
        {
          "id": 16,
          "type": "site",
          "color": "orange",
          "name": "Haunted Westeland",
          "sellingPrice": 180,
          "textColorOnShow": "black",
          "rent": 14,
          "rentWithHouse": [
            70,
            200,
            550,
            750,
            950
          ],
          "mortgage": 90,
          "construction": 100,
          "subType": "orange",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 23,
          "type": "site",
          "color": "red",
          "name": "Goron City",
          "sellingPrice": 220,
          "textColorOnShow": "black",
          "rent": 18,
          "rentWithHouse": [
            90,
            250,
            700,
            875,
            1050
          ],
          "mortgage": 110,
          "construction": 150,
          "subType": "red",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 27,
          "type": "site",
          "color": "yellow",
          "name": "Hyrule Castle",
          "sellingPrice": 260,
          "textColorOnShow": "black",
          "rent": 22,
          "rentWithHouse": [
            110,
            330,
            800,
            975,
            1150
          ],
          "mortgage": 130,
          "construction": 150,
          "subType": "yellow",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 32,
          "type": "site",
          "color": "skyblue",
          "name": "Zora's Domain",
          "sellingPrice": 300,
          "textColorOnShow": "black",
          "rent": 26,
          "rentWithHouse": [
            130,
            390,
            900,
            1100,
            1275
          ],
          "mortgage": 150,
          "construction": 200,
          "subType": "skyblue",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 39,
          "type": "site",
          "color": "blue",
          "name": "City in the sky",
          "sellingPrice": 400,
          "textColorOnShow": "white",
          "rent": 50,
          "rentWithHouse": [
            200,
            600,
            1400,
            1700,
            2000
          ],
          "mortgage": 200,
          "construction": 200,
          "subType": "blue",
          "isMortgaged": false,
          "built": 0
        }
      ],
      "1": [
        {
          "id": 1,
          "type": "site",
          "color": "brown",
          "name": "Minish Woods",
          "sellingPrice": 60,
          "textColorOnShow": "white",
          "rent": 2,
          "mortgage": 30,
          "construction": 50,
          "rentWithHouse": [
            10,
            30,
            90,
            160,
            250
          ],
          "subType": "brown",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 8,
          "type": "site",
          "color": "green",
          "name": "Lost Woods",
          "sellingPrice": 100,
          "textColorOnShow": "black",
          "rent": 6,
          "rentWithHouse": [
            30,
            90,
            270,
            400,
            550
          ],
          "mortgage": 50,
          "construction": 50,
          "subType": "green",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 13,
          "type": "site",
          "color": "pink",
          "name": "Kakariko Village",
          "sellingPrice": 140,
          "textColorOnShow": "black",
          "rent": 10,
          "rentWithHouse": [
            50,
            150,
            450,
            625,
            750
          ],
          "mortgage": 70,
          "construction": 100,
          "subType": "pink",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 18,
          "type": "site",
          "color": "orange",
          "name": "Gerudo Fortress",
          "sellingPrice": 180,
          "textColorOnShow": "black",
          "rent": 14,
          "rentWithHouse": [
            70,
            200,
            550,
            750,
            950
          ],
          "mortgage": 90,
          "construction": 100,
          "subType": "orange",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 24,
          "type": "site",
          "color": "red",
          "name": "Fire Temple",
          "sellingPrice": 240,
          "textColorOnShow": "black",
          "rent": 20,
          "rentWithHouse": [
            100,
            300,
            750,
            925,
            1100
          ],
          "mortgage": 120,
          "construction": 150,
          "subType": "red",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 28,
          "type": "utility",
          "color": "lightgrey",
          "name": "Waterfall Cave",
          "sellingPrice": 150,
          "subType": "utility",
          "isMortgaged": false
        },
        {
          "id": 34,
          "type": "site",
          "color": "skyblue",
          "name": "Water Temple",
          "sellingPrice": 320,
          "textColorOnShow": "black",
          "rent": 28,
          "rentWithHouse": [
            150,
            450,
            1000,
            1200,
            1400
          ],
          "mortgage": 160,
          "construction": 200,
          "subType": "skyblue",
          "isMortgaged": false,
          "built": 0
        }
      ],
      "2": [
        {
          "id": 3,
          "type": "site",
          "color": "brown",
          "name": "Ordon Village",
          "sellingPrice": 60,
          "textColorOnShow": "white",
          "rent": 4,
          "mortgage": 30,
          "construction": 50,
          "rentWithHouse": [
            20,
            60,
            180,
            320,
            450
          ],
          "subType": "brown",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 9,
          "type": "site",
          "color": "green",
          "name": "Forest Temple",
          "sellingPrice": 120,
          "textColorOnShow": "black",
          "rent": 8,
          "rentWithHouse": [
            40,
            100,
            300,
            450,
            600
          ],
          "mortgage": 60,
          "construction": 50,
          "subType": "green",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 14,
          "type": "site",
          "color": "pink",
          "name": "Shadow Temple",
          "sellingPrice": 160,
          "textColorOnShow": "black",
          "rent": 12,
          "rentWithHouse": [
            60,
            80,
            500,
            700,
            900
          ],
          "mortgage": 80,
          "construction": 100,
          "subType": "pink",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 19,
          "type": "site",
          "color": "orange",
          "name": "Spirit Temple",
          "sellingPrice": 200,
          "textColorOnShow": "black",
          "rent": 16,
          "rentWithHouse": [
            80,
            220,
            600,
            800,
            1000
          ],
          "mortgage": 100,
          "construction": 100,
          "subType": "orange",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 25,
          "type": "realm_rails",
          "color": "grey",
          "name": "Fire Realm Rails",
          "sellingPrice": 200,
          "textColorOnShow": "white",
          "rent": [
            25,
            50,
            100,
            200
          ],
          "mortgage": 100,
          "subType": "realm_rails",
          "isMortgaged": false
        },
        {
          "id": 29,
          "type": "site",
          "color": "yellow",
          "name": "Temple of Time",
          "sellingPrice": 280,
          "textColorOnShow": "black",
          "rent": 24,
          "rentWithHouse": [
            120,
            360,
            850,
            1025,
            1200
          ],
          "mortgage": 140,
          "construction": 150,
          "subType": "yellow",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 35,
          "type": "realm_rails",
          "color": "grey",
          "name": "Ocean Realm Rails",
          "sellingPrice": 200,
          "textColorOnShow": "white",
          "rent": [
            25,
            50,
            100,
            200
          ],
          "mortgage": 100,
          "subType": "realm_rails",
          "isMortgaged": false
        }
      ],
      "3": [
        {
          "id": 5,
          "type": "realm_rails",
          "color": "grey",
          "textColorOnShow": "white",
          "name": "Forest Realm Rails",
          "sellingPrice": 200,
          "rent": [
            25,
            50,
            100,
            200
          ],
          "mortgage": 100,
          "subType": "realm_rails",
          "isMortgaged": false
        },
        {
          "id": 11,
          "type": "site",
          "color": "pink",
          "name": "Graveyard",
          "sellingPrice": 140,
          "textColorOnShow": "black",
          "rent": 10,
          "rentWithHouse": [
            50,
            150,
            450,
            625,
            750
          ],
          "mortgage": 70,
          "construction": 100,
          "subType": "pink",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 15,
          "type": "realm_rails",
          "color": "grey",
          "name": "Send Relm Rails",
          "sellingPrice": 200,
          "textColorOnShow": "white",
          "rent": [
            25,
            50,
            100,
            200
          ],
          "mortgage": 100,
          "subType": "realm_rails",
          "isMortgaged": false
        },
        {
          "id": 21,
          "type": "site",
          "color": "red",
          "name": "Death Mountain",
          "sellingPrice": 220,
          "textColorOnShow": "black",
          "rent": 18,
          "rentWithHouse": [
            90,
            250,
            700,
            875,
            1050
          ],
          "mortgage": 110,
          "construction": 150,
          "subType": "red",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 26,
          "type": "site",
          "color": "yellow",
          "name": "Lon Lon Ranch",
          "sellingPrice": 260,
          "textColorOnShow": "black",
          "rent": 22,
          "rentWithHouse": [
            110,
            330,
            800,
            975,
            1150
          ],
          "mortgage": 130,
          "construction": 150,
          "subType": "yellow",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 31,
          "type": "site",
          "color": "skyblue",
          "name": "Lake Hylia",
          "sellingPrice": 300,
          "textColorOnShow": "black",
          "rent": 26,
          "rentWithHouse": [
            130,
            390,
            900,
            1100,
            1275
          ],
          "mortgage": 150,
          "construction": 200,
          "subType": "skyblue",
          "isMortgaged": false,
          "built": 0
        },
        {
          "id": 37,
          "type": "site",
          "color": "blue",
          "name": "Skyloft",
          "sellingPrice": 350,
          "textColorOnShow": "white",
          "rent": 35,
          "rentWithHouse": [
            175,
            500,
            1100,
            1300,
            1500
          ],
          "mortgage": 175,
          "construction": 200,
          "subType": "blue",
          "isMortgaged": false,
          "built": 0
        }
      ]
    }
    return player
}
