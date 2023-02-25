import {createStore} from "redux";
// import thunk from "redux-thunk";
import rootReducer from "./reducers/rootReducer";

export default function configureStore(){
    return createStore(
        rootReducer,
        // applyMiddleware(
            // thunk,
            
        process.env.NODE_ENV==="development"?window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__():""
        // )
    )
}