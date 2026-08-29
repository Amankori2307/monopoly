import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { appStore } from './app/appStore';
import { exposeLoggerForDebugging } from './shared/utils/logger.utils';

// `window.monopolyLog` for inspecting what happened after something goes wrong.
exposeLoggerForDebugging();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={appStore}>
      <App />
    </Provider>
  </React.StrictMode>
);
