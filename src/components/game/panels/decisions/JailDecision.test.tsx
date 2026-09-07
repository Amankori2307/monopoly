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
  const props = (extra: Partial<Parameters<typeof JailDecision>[0]> = {}) => ({
    ...overrides,
    ...extra,
  });
  const view = render(
    <JailDecision
      attemptsUsed={0}
      canUseJailCard={false}
      currencySymbol="₹"
      lastRoll={null}
      lastRollId={null}
      soundEnabled
      onAttemptJailRoll={onAttemptJailRoll}
      onPayFine={onPayFine}
      onUseJailCard={onUseJailCard}
      playerName="Asha"
      {...overrides}
    />
  );
  /** Re-renders with a new throw, the way the engine's state would arrive. */
  const rerender = (extra: Partial<Parameters<typeof JailDecision>[0]>) =>
    view.rerender(
      <JailDecision
        attemptsUsed={0}
        canUseJailCard={false}
        currencySymbol="₹"
        lastRoll={null}
        lastRollId={null}
        soundEnabled
        onAttemptJailRoll={onAttemptJailRoll}
        onPayFine={onPayFine}
        onUseJailCard={onUseJailCard}
        playerName="Asha"
        {...props(extra)}
      />
    );

  return { onAttemptJailRoll, onPayFine, onUseJailCard, rerender };
};

describe('the ways out of Jail', () => {
  it('offers all three', () => {
    renderPanel({ canUseJailCard: true });

    expect(screen.getByTestId(TEST_IDS.jailRollButton)).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Pay / })).toBeEnabled();
    expect(screen.getByRole('button', { name: /jail card/i })).toBeEnabled();
  });

  it('rolls for doubles the moment it is asked', () => {
    const { onAttemptJailRoll } = renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.jailRollButton));

    // The tumble runs after the commit now, exactly as it does for an ordinary
    // roll: the engine decides the throw, and every device animates the id it
    // stamped. Waiting 520ms to dispatch would mean the other players saw the
    // faces snap to a result with no throw at all.
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
  it('plays the dice sound when the throw comes back', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    const { rerender } = renderPanel();

    // The sound belongs to the tumble, and the tumble belongs to the throw - so
    // it sounds on every device, not only on the one that clicked.
    act(() => rerender({ lastRoll: [2, 4], lastRollId: 'roll-1' }));

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
    const { rerender } = renderPanel();
    const button = screen.getByTestId(TEST_IDS.jailRollButton);

    fireEvent.click(button);
    // Locked immediately - this device is waiting for its own command.
    expect(button).toHaveTextContent('Rolling');
    expect(button).toBeDisabled();

    act(() => rerender({ lastRoll: [2, 4], lastRollId: 'roll-1' }));
    expect(button).toHaveTextContent('Rolling');

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
