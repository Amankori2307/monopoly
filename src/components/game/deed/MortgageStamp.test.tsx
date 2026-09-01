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
   * It said nothing at first, on the argument that a ~52x89px square could not
   * hold the word. That was measured against the cell's short axis with a bad
   * character advance, and the frame alone read as a stray rectangle. Along the
   * long axis the word fits.
   */
  it('says it on a board square too', () => {
    render(<MortgageStamp testId="space-mortgaged-1" variant="space-wide" />);

    expect(screen.getByTestId('space-mortgaged-1')).toHaveTextContent('MORTGAGED');
  });

  // Nothing for a screen reader: the deed's stamp is the notice, and a board
  // square would just repeat it forty times.
  it('announces nothing from a board square', () => {
    render(<MortgageStamp testId="space-mortgaged-1" variant="space-wide" />);

    const stamp = screen.getByTestId('space-mortgaged-1');
    expect(stamp).toHaveAttribute('aria-hidden', 'true');
    expect(stamp).not.toHaveAttribute('role');
  });

  /**
   * The word has to run along the cell's long axis to have room, and that axis is
   * a quarter turn apart on the two pairs of board sides. The rotation is baked
   * into each viewBox rather than applied in CSS, because a CSS rotation happens
   * after layout: the size would still resolve against the short side.
   */
  it('draws the two board orientations from transposed boxes', () => {
    const wide = render(<MortgageStamp variant="space-wide" />);
    const wideBox = wide.container.querySelector('svg')?.getAttribute('viewBox');
    wide.unmount();

    const tall = render(<MortgageStamp variant="space-tall" />);
    const tallBox = tall.container.querySelector('svg')?.getAttribute('viewBox');

    const [, , wideW, wideH] = (wideBox ?? '').split(' ').map(Number);
    const [, , tallW, tallH] = (tallBox ?? '').split(' ').map(Number);
    expect(wideW).toBeGreaterThan(wideH);
    expect(tallH).toBeGreaterThan(tallW);
  });

  /**
   * Both square variants must share every rule - opacity, clipping, z-index -
   * and interpolating the variant into the class silently produced
   * `is-space-tall`, which matched none of them. The stamp then rendered fully
   * opaque and swamped the space name.
   */
  it('gives both board orientations the same class', () => {
    const wide = render(<MortgageStamp variant="space-wide" />);
    expect(wide.container.firstElementChild).toHaveClass('is-space');
    wide.unmount();

    const tall = render(<MortgageStamp variant="space-tall" />);
    expect(tall.container.firstElementChild).toHaveClass('is-space');
    expect(tall.container.firstElementChild).not.toHaveClass('is-space-tall');
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
    const space = render(<MortgageStamp variant="space-wide" />);
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
    const { container } = render(<MortgageStamp variant="space-wide" />);

    // The rule lives in CSS, which jsdom does not apply - so assert the class
    // that carries it is present, and let the e2e suite prove the behaviour.
    expect(container.firstElementChild).toHaveClass('mortgage-stamp');
    expect(container.firstElementChild).toHaveClass('is-space');
  });

  /**
   * The word comes off on a phone, where the squares are about 29x49px and it
   * cannot be read at any weight. The stylesheet hides this group; jsdom does not
   * apply it, so the hook it needs is what gets asserted here.
   */
  it('puts the word in a group the stylesheet can hide on a phone', () => {
    const { container } = render(<MortgageStamp variant="space-wide" />);

    expect(container.querySelector('.mortgage-stamp-word')).not.toBeNull();
  });
});
