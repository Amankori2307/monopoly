import { createStore } from 'redux';
// import thunk from "redux-thunk";
import rootReducer from './reducers/rootReducer';

// Declare the Redux DevTools extension type
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => any;
  }
}

export default function configureStore() {
  return createStore(
    rootReducer,
    // applyMiddleware(
    // thunk,

    process.env.NODE_ENV === 'development' &&
      window.__REDUX_DEVTOOLS_EXTENSION__
      ? window.__REDUX_DEVTOOLS_EXTENSION__()
      : undefined
    // )
  );
}
