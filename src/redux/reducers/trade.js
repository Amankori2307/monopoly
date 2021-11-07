
const initialState = {
    from: null,
    to: null,
    cardLists: null,
    askOrSendMoney: null
}

const trade = (state=initialState, action) => {
    const {type, payload} = action
    switch(type){
        default:
            return state
    }
} 