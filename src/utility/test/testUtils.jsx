import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { Provider } from 'react-redux'
import reducer from '../../redux/reducers/rootReducer'
import { createStore } from 'redux'

function render(
  ui,
  {
    preloadedState,
    store = createStore(reducer, preloadedState),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>
  }
  return {...rtlRender(ui, { wrapper: Wrapper, ...renderOptions })}
}

// re-export everything
export * from '@testing-library/react'
// override render method
export { render }