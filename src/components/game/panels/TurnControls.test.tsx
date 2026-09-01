import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpeedDieFace } from '../../../domain/types/game.enums';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { TurnControls } from './TurnControls';

const renderControls = (overrides: Partial<Parameters<typeof TurnControls>[0]> = {}) => {
  const onEndTurn = vi.fn();
  const onRoll = vi.fn();
  render(
    <TurnControls
      canEndTurn={false}
      canRoll={true}
      canRollAgain={false}
      lastRoll={[3, 4]}
      onEndTurn={onEndTurn}
      onRoll={onRoll}
      rollLabel="Roll dice"
      speedDieFace={null}
      {...overrides}
    />
  );
  return { onEndTurn, onRoll };
};

describe('TurnControls', () => {
  it('offers no end-turn button until the turn can end', () => {
    renderControls();

    expect(screen.queryByTestId(TEST_IDS.endTurnButton)).not.toBeInTheDocument();
  });

  it('reports the end of a turn', () => {
    const { onEndTurn } = renderControls({ canEndTurn: true });

    fireEvent.click(screen.getByTestId(TEST_IDS.endTurnButton));

    expect(onEndTurn).toHaveBeenCalledOnce();
  });

  // A double earns another roll, so the same button means something different -
  // pressing it takes the roll rather than giving up the turn.
  it('says the button takes the extra roll when a double earned one', () => {
    renderControls({ canEndTurn: true, canRollAgain: true });

    expect(screen.getByTestId(TEST_IDS.endTurnButton)).toHaveTextContent(
      'Take extra roll'
    );
  });

  it('says Done when there is no extra roll', () => {
    renderControls({ canEndTurn: true });

    expect(screen.getByTestId(TEST_IDS.endTurnButton)).toHaveTextContent('Done');
  });

  it('disables the roll button when rolling is not available', () => {
    renderControls({ canRoll: false });

    expect(screen.getByTestId(TEST_IDS.rollButton)).toBeDisabled();
  });

  it('uses the label it is given, so a jail roll can say so', () => {
    renderControls({ rollLabel: 'Roll for doubles' });

    expect(screen.getByTestId(TEST_IDS.rollButton)).toHaveTextContent('Roll for doubles');
  });

  it('shows the Speed Die only when the game has one', () => {
    const { unmount } = render(
      <TurnControls
        canEndTurn={false}
        canRoll={true}
        canRollAgain={false}
        lastRoll={[3, 4]}
        onEndTurn={vi.fn()}
        onRoll={vi.fn()}
        rollLabel="Roll dice"
        speedDieFace={SpeedDieFace.Bus}
      />
    );
    expect(screen.getByTestId(TEST_IDS.speedDieFace)).toBeInTheDocument();

    unmount();
    renderControls({ speedDieFace: null });
    expect(screen.queryByTestId(TEST_IDS.speedDieFace)).not.toBeInTheDocument();
  });
});
