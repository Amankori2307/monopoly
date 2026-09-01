import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLog, getLogErrors } from '../utils/logger.utils';
import { TEST_IDS } from '../constants/testIds.constants';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * A render that throws used to white-screen the app with no way back and
 * nothing in the log.
 */

const Boom = ({ message = 'ownership is undefined' }: { message?: string }) => {
  throw new Error(message);
};

beforeEach(() => {
  clearLog();
  // React logs the caught error itself; that noise is not the test's business.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('when nothing throws', () => {
  it('renders its children untouched', () => {
    render(
      <ErrorBoundary>
        <p>the board</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('the board')).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.errorBoundary)).not.toBeInTheDocument();
  });
});

describe('when a child throws while rendering', () => {
  it('shows the fallback instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByTestId(TEST_IDS.errorBoundary)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /could not be shown/i
    );
  });

  it('says what went wrong, so the report is actionable', () => {
    render(
      <ErrorBoundary>
        <Boom message="space-42 is not on the board" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId(TEST_IDS.errorBoundary)).toHaveTextContent(
      'space-42 is not on the board'
    );
  });

  it('logs it with the component stack', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    const errors = getLogErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/threw while rendering/i);
    expect(errors[0].context).toHaveProperty('componentStack');
  });

  // A router link would re-render the tree that just threw and land straight
  // back on this screen, so the way out is a real navigation.
  it('offers a full reload rather than a router link', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    const link = screen.getByRole('link', { name: /back to games/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('reassures the player their saves are intact', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByTestId(TEST_IDS.errorBoundary)).toHaveTextContent(
      /saved games are untouched/i
    );
  });
});
