import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppSelector } from '../app/hooks';
import { setAuctionBidInput } from '../features/game/uiSlice';
import { renderWithProviders } from './renderWithProviders';

/**
 * The harness itself, tested.
 *
 * It used to hand every render the app's singleton store, so one test's
 * dispatches leaked into the next in the same file. jsdom is per file, so this
 * could never cross files - which is why it stayed latent, and why it needs a
 * test rather than a reviewer's memory.
 */
function BidReadout() {
  const bid = useAppSelector((state) => state.ui.auctionBidInput);
  return <span data-testid="bid">{bid?.amount ?? 'none'}</span>;
}

describe('renderWithProviders', () => {
  it('gives each render its own store', () => {
    const first = renderWithProviders(<BidReadout />);
    // act, or React never re-renders and the assertion reads the initial value.
    act(() => {
      first.store.dispatch(setAuctionBidInput({ key: 'a:p1:0', amount: 999 }));
    });
    expect(first.getByTestId('bid')).toHaveTextContent('999');
    first.unmount();

    // A second render in the same file must not see the first's dispatch.
    const second = renderWithProviders(<BidReadout />);

    expect(second.getByTestId('bid')).not.toHaveTextContent('999');
  });

  it('starts a render from preloadedState', () => {
    renderWithProviders(<BidReadout />, {
      preloadedState: {
        ui: { auctionBidInput: { key: 'a:p1:0', amount: 42 }, toasts: [] },
      },
    });

    expect(screen.getByTestId('bid')).toHaveTextContent('42');
  });

  it('returns the store so a test can assert what a dispatch did', () => {
    const { store } = renderWithProviders(<BidReadout />);

    act(() => {
      store.dispatch(setAuctionBidInput({ key: 'a:p1:0', amount: 7 }));
    });

    expect(store.getState().ui.auctionBidInput).toEqual({ key: 'a:p1:0', amount: 7 });
  });
});
