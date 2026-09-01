import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { CommandErrorBanner } from './CommandErrorBanner';

/**
 * The engine throws on an invalid command and the thunk catches it; this is
 * where the player finds out why nothing happened.
 */
describe('CommandErrorBanner', () => {
  it('shows nothing when there is no error', () => {
    render(<CommandErrorBanner message={null} onDismiss={vi.fn()} />);

    expect(screen.queryByTestId(TEST_IDS.commandError)).not.toBeInTheDocument();
  });

  it('shows the engine message verbatim', () => {
    render(
      <CommandErrorBanner
        message="Rolling is not available right now."
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByTestId(TEST_IDS.commandError)).toHaveTextContent(
      'Rolling is not available right now.'
    );
  });

  // A rejected action is not a passive notice: it explains why the player's
  // click did nothing, so it interrupts a screen reader rather than waiting.
  it('announces itself as an alert', () => {
    render(<CommandErrorBanner message="Nope." onDismiss={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('can be dismissed', () => {
    const onDismiss = vi.fn();
    render(<CommandErrorBanner message="Nope." onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
