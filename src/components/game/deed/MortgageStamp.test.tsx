import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { MortgageStamp } from './MortgageStamp';

/**
 * The watermark itself.
 *
 * Its whole job is to be obvious without hiding what it covers, so the opacity
 * that makes it a watermark lives in CSS and is asserted where it can be
 * measured - the e2e suite. What is testable here is the shape of the thing: the
 * wording, who announces it, and the filter ids.
 */

const filterIdsIn = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('filter')).map((filter) => filter.id);

describe('MortgageStamp', () => {
  it('says what it means, on a deed', () => {
    render(<MortgageStamp variant="deed" />);

    expect(screen.getByRole('img', { name: 'Mortgaged' })).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.deedMortgaged)).toHaveTextContent('MORTGAGED');
  });

  /**
   * A board square is about 52x89px and already carries the space name; the word
   * across it would be a seven-pixel font over existing text. The frame alone
   * reads as "stamped" at that size, and there is nothing there for a screen
   * reader, so it is hidden from one.
   */
  it('carries no wording on a board square, and announces nothing', () => {
    const { container } = render(
      <MortgageStamp testId="space-mortgaged-1" variant="space" />
    );

    const stamp = screen.getByTestId('space-mortgaged-1');
    expect(stamp).toHaveAttribute('aria-hidden', 'true');
    expect(stamp).not.toHaveAttribute('role');
    expect(stamp.textContent).toBe('');
    expect(container.querySelector('text')).toBeNull();
  });

  it('takes its colour from the theme rather than baking one in', () => {
    const { container } = render(<MortgageStamp variant="deed" />);

    // currentColor throughout, so the stylesheet's token decides.
    const painted = Array.from(container.querySelectorAll('rect, text'));
    expect(painted.length).toBeGreaterThan(0);
    painted.forEach((node) => {
      const value = node.getAttribute('stroke') ?? node.getAttribute('fill');
      expect(value).toBe('currentColor');
    });
  });

  it('grunges the deed stamp, and leaves a board square plain', () => {
    const deed = render(<MortgageStamp variant="deed" />);
    expect(filterIdsIn(deed.container)).toHaveLength(1);
    deed.unmount();

    // Forty filtered SVGs on the board would be a cost for nothing: the bitten
    // edge does not read at that size.
    const space = render(<MortgageStamp variant="space" />);
    expect(filterIdsIn(space.container)).toHaveLength(0);
  });

  /**
   * The drawer shows a featured deed with the stack behind it, so two stamps are
   * on screen at once. A hard-coded filter id would have them collide and one
   * would render unfiltered.
   */
  it('gives every deed stamp its own filter id', () => {
    const { container } = render(
      <>
        <MortgageStamp variant="deed" />
        <MortgageStamp variant="deed" />
      </>
    );

    const ids = filterIdsIn(container);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    // And each group points at its own, not at a shared one.
    const referenced = Array.from(container.querySelectorAll('g')).map((group) =>
      group.getAttribute('filter')
    );
    expect(referenced).toEqual(ids.map((id) => `url(#${id})`));
  });

  it('never intercepts a click, because it covers a button', () => {
    const { container } = render(<MortgageStamp variant="space" />);

    // The rule lives in CSS, which jsdom does not apply - so assert the class
    // that carries it is present, and let the e2e suite prove the behaviour.
    expect(container.firstElementChild).toHaveClass('mortgage-stamp');
    expect(container.firstElementChild).toHaveClass('is-space');
  });
});
