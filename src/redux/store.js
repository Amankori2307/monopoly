import {createStore, applyMiddleware} from "redux";
import thunk from "redux-thunk";
import rootReducer from "./reducers/rootReducer";

export default function(){
    return createStore(
        rootReducer,
        // applyMiddleware(
            // thunk,
            
        window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
        // )
    )
}