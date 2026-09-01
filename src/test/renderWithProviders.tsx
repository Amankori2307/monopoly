import { render } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { makeStore } from '../app/appStore';

/**
 * Renders a component with the store and router it needs.
 *
 * A fresh store per call: sharing the app's singleton meant one test's
 * dispatches leaked into the next in the same file. The store is returned so a
 * test can assert on what a dispatch actually did.
 *
 * The options type stays inline on purpose - this file is not exempt from the
 * exported-shapes lint rule. See docs/conventions.md section 1.
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: {
    preloadedState?: Parameters<typeof makeStore>[0];
    route?: string;
  }
) => {
  const route = options?.route ?? '/';
  const store = makeStore(options?.preloadedState);

  const Wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper }) };
};
