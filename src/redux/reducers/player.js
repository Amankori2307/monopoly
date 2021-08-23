const initialState = {
    site: 1,
    bottom: 0,
    right: 0,
}

function player(state = initialState, action){
    const {type, payload} = action;
    switch(type){
        default:
            return state;
            break;
    }
}