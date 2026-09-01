import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MAX_JAIL_TURNS } from '../../../../domain/constants/game.constants';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { JailDecision } from './JailDecision';

/**
 * The panel used to offer two ways out, both of which cost something. Trying for
 * doubles - the free one, and the one the rules give three goes at - was only on
 * the dice dock, underneath this modal's backdrop.
 */
const renderPanel = (overrides: Partial<Parameters<typeof JailDecision>[0]> = {}) => {
  const onAttemptJailRoll = vi.fn();
  const onPayFine = vi.fn();
  const onUseJailCard = vi.fn();
  render(
    <JailDecision
      attemptsUsed={0}
      canUseJailCard={false}
      currencySymbol="₹"
      onAttemptJailRoll={onAttemptJailRoll}
      onPayFine={onPayFine}
      onUseJailCard={onUseJailCard}
      playerName="Asha"
      {...overrides}
    />
  );
  return { onAttemptJailRoll, onPayFine, onUseJailCard };
};

describe('the ways out of Jail', () => {
  it('offers all three', () => {
    renderPanel({ canUseJailCard: true });

    expect(screen.getByTestId(TEST_IDS.jailRollButton)).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Pay / })).toBeEnabled();
    expect(screen.getByRole('button', { name: /jail card/i })).toBeEnabled();
  });

  it('rolls for doubles when asked', () => {
    const { onAttemptJailRoll } = renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.jailRollButton));

    expect(onAttemptJailRoll).toHaveBeenCalledOnce();
  });

  it('offers the roll even with no card to use', () => {
    renderPanel({ canUseJailCard: false });

    expect(screen.getByTestId(TEST_IDS.jailRollButton)).toBeEnabled();
    expect(screen.getByRole('button', { name: /jail card/i })).toBeDisabled();
  });
});

describe('the attempt counter', () => {
  // A player deciding whether to risk another roll needs to know which attempt
  // they are on, because the third failure is where the fine stops being a
  // choice.
  it.each([
    [0, 1],
    [1, 2],
    [2, 3],
  ])('reads attempt %i as number %i of three', (used, shown) => {
    renderPanel({ attemptsUsed: used });

    expect(screen.getByTestId(TEST_IDS.jailAttempt)).toHaveTextContent(
      `Attempt ${shown} of ${MAX_JAIL_TURNS}`
    );
  });

  it('says rolling is free while it is', () => {
    renderPanel({ attemptsUsed: 0 });

    expect(screen.getByTestId(TEST_IDS.jailAttempt)).toHaveTextContent(/costs nothing/i);
  });

  it('warns on the last attempt that the fine becomes automatic', () => {
    renderPanel({ attemptsUsed: MAX_JAIL_TURNS - 1 });

    expect(screen.getByTestId(TEST_IDS.jailAttempt)).toHaveTextContent(
      /charged automatically/i
    );
  });

  // Defensive: a save with more served turns than the rules allow should not
  // render "Attempt 4 of 3".
  it('never counts past the last attempt', () => {
    renderPanel({ attemptsUsed: 9 });

    expect(screen.getByTestId(TEST_IDS.jailAttempt)).toHaveTextContent(
      `Attempt ${MAX_JAIL_TURNS} of ${MAX_JAIL_TURNS}`
    );
  });
});
