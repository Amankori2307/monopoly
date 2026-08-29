import { render } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { appStore } from '../app/appStore';

export const renderWithProviders = (
  ui: ReactElement,
  options?: {
    route?: string;
  }
) => {
  const route = options?.route ?? '/';
  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={appStore}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );

  return render(ui, { wrapper: Wrapper });
};
