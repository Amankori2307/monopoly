

const initialState = {
    showModal: false,
    currentCard: null
}

export default (state = initialState, action) => {
    const {type, payload} = action
    switch(type){
        default:
            return state;
            break;
    }
}