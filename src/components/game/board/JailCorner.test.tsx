import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { JAIL_BAND_FRACTION } from '../../../domain/board/boardLayout.utils';
import { JAIL_POSITION } from '../../../domain/constants/game.constants';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { JailCorner } from './JailCorner';

const JAIL_NAME = indiaEditionBoard[JAIL_POSITION].name;

describe('JailCorner', () => {
  it('puts the two halves of the name in their own regions', () => {
    render(<JailCorner name={JAIL_NAME} />);

    expect(screen.getByTestId(TEST_IDS.jailCell)).toHaveTextContent('Jail');
    expect(screen.getByTestId(TEST_IDS.jailVisitingBand)).toHaveTextContent(
      'Just Visiting'
    );
  });

  /**
   * The square still has to read as the one name the board data gives it -
   * board.spec.ts asserts the corner contains "Jail / Just Visiting"
   * contiguously, and splitting it across two boxes would break that if the
   * separator were dropped rather than hidden.
   */
  it('still reads as the whole space name', () => {
    const { container } = render(<JailCorner name={JAIL_NAME} />);

    expect(container.textContent).toBe(JAIL_NAME);
  });

  // The band the eye sees and the band the token maths uses are one constant.
  it('hands the stylesheet the same band width the geometry uses', () => {
    const { container } = render(<JailCorner name={JAIL_NAME} />);

    const corner = container.querySelector('.jail-corner') as HTMLElement;
    expect(corner.style.getPropertyValue('--jail-band-size')).toBe(
      `${JAIL_BAND_FRACTION * 100}%`
    );
  });

  it('draws the bars, and hides them from a screen reader', () => {
    const { container } = render(<JailCorner name={JAIL_NAME} />);

    const bars = container.querySelector('.jail-bars');
    expect(bars?.tagName.toLowerCase()).toBe('svg');
    expect(bars).toHaveAttribute('aria-hidden', 'true');
    // A gradient's stops are pixels and the square is not, so the bar count
    // would change with the screen. Fixed geometry keeps it constant.
    expect(bars?.querySelectorAll('line')).toHaveLength(6);
  });

  // The name is board data, so the component must not assume its shape.
  it('degrades to a single label for a name with no separator', () => {
    render(<JailCorner name="Jail" />);

    expect(screen.getByTestId(TEST_IDS.jailCell)).toHaveTextContent('Jail');
    expect(screen.queryByTestId(TEST_IDS.jailVisitingBand)).not.toBeInTheDocument();
  });
});
