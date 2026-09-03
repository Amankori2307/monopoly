import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_JAIL_TURNS } from '../../../../domain/constants/game.constants';
import { scopedTestId, TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { DICE_ROLL_DURATION_MS } from '../../diceDock.constants';
import { JailDecision } from './JailDecision';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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
      lastRoll={null}
      soundEnabled
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

  it('rolls for doubles when asked, once the dice have settled', () => {
    const { onAttemptJailRoll } = renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.jailRollButton));

    // The dice tumble first, exactly as they do for an ordinary roll.
    expect(onAttemptJailRoll).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));
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

/**
 * A Jail roll is a roll.
 *
 * It used to dispatch the command straight out: no tumble, no sound, while every
 * other roll in the game had both - and the dice dock that would have shown them
 * is behind this modal's backdrop. It goes through the same `useDiceRoller` now.
 */
describe('rolling for doubles', () => {
  it('plays the dice sound', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.jailRollButton));

    expect(play).toHaveBeenCalled();
  });

  it('shows two dice, here rather than on the covered dock', () => {
    renderPanel({ lastRoll: [3, 5] });

    expect(screen.getByTestId(scopedTestId(TEST_IDS.dieFace, 0))).toHaveTextContent('');
    expect(screen.getAllByTestId(/die-face/)).toHaveLength(2);
  });

  it('settles the dice on the throw the engine made', () => {
    renderPanel({ lastRoll: [3, 5] });

    expect(screen.getByTestId(scopedTestId(TEST_IDS.dieFace, 0))).toHaveAttribute(
      'aria-label',
      '3'
    );
    expect(screen.getByTestId(scopedTestId(TEST_IDS.dieFace, 1))).toHaveAttribute(
      'aria-label',
      '5'
    );
  });

  it('tumbles while it rolls, and stops when it lands', () => {
    renderPanel();
    const button = screen.getByTestId(TEST_IDS.jailRollButton);

    fireEvent.click(button);
    expect(button).toHaveTextContent('Rolling');
    expect(button).toBeDisabled();

    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));
    expect(button).toHaveTextContent('Roll for doubles');
  });

  // The other two ways out must not be taken while the dice are in the air.
  it('withholds the fine and the card mid-roll', () => {
    renderPanel({ canUseJailCard: true });

    fireEvent.click(screen.getByTestId(TEST_IDS.jailRollButton));

    expect(screen.getByRole('button', { name: /^Pay / })).toBeDisabled();
    expect(screen.getByRole('button', { name: /jail card/i })).toBeDisabled();
  });

  it('cannot be double-clicked into two rolls', () => {
    const { onAttemptJailRoll } = renderPanel();
    const button = screen.getByTestId(TEST_IDS.jailRollButton);

    fireEvent.click(button);
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(onAttemptJailRoll).toHaveBeenCalledOnce();
  });
});
