import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpeedDieFace } from '../../domain/types/game.enums';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { DicePair } from './DicePair';

/**
 * The faces, split from the dock so the phone can put them between the two
 * columns of player cards while the Roll button stays in the bar.
 *
 * Presentational on purpose: the roller is called once by GameSidebar and its
 * result handed to both mounts, because the hook plays the roll sound and two
 * of them would sound every throw twice.
 */
describe('DicePair', () => {
  it('shows the throw it is given', () => {
    render(
      <DicePair
        displayValues={[2, 5]}
        isRolling={false}
        scope="dock"
        speedDieFace={null}
      />
    );

    expect(screen.getByTestId(`${TEST_IDS.dieFace}-0`)).toHaveAttribute(
      'aria-label',
      '2'
    );
    expect(screen.getByTestId(`${TEST_IDS.dieFace}-1`)).toHaveAttribute(
      'aria-label',
      '5'
    );
  });

  // Two elements answering one test id is a Playwright strict-mode failure
  // even when one of them is display:none, which is exactly how these two are
  // kept apart on screen.
  it('takes its own ids in the HUD, so a query can name one mount', () => {
    render(
      <DicePair
        displayValues={[1, 1]}
        isRolling={false}
        scope="hud"
        speedDieFace={null}
      />
    );

    expect(screen.getByTestId(`${TEST_IDS.dieFaceHud}-0`)).toBeInTheDocument();
    expect(screen.queryByTestId(`${TEST_IDS.dieFace}-0`)).not.toBeInTheDocument();
  });

  it('carries the class the stylesheet shows or hides', () => {
    const { container, unmount } = render(
      <DicePair
        displayValues={[3, 3]}
        isRolling={false}
        scope="dock"
        speedDieFace={null}
      />
    );
    expect(container.querySelector('.dice-pair')).toHaveClass('is-dock');

    unmount();
    const hud = render(
      <DicePair
        displayValues={[3, 3]}
        isRolling={false}
        scope="hud"
        speedDieFace={null}
      />
    );
    expect(hud.container.querySelector('.dice-pair')).toHaveClass('is-hud');
  });

  it('shows the Speed Die only when the game has one', () => {
    const { unmount } = render(
      <DicePair
        displayValues={[4, 2]}
        isRolling={false}
        scope="dock"
        speedDieFace={SpeedDieFace.MrMonopoly}
      />
    );
    expect(screen.getByTestId(TEST_IDS.speedDieFace)).toHaveTextContent('MR. M');

    unmount();
    render(
      <DicePair
        displayValues={[4, 2]}
        isRolling={false}
        scope="dock"
        speedDieFace={null}
      />
    );
    expect(screen.queryByTestId(TEST_IDS.speedDieFace)).not.toBeInTheDocument();
  });

  it('tumbles every face together, or none of them', () => {
    const { container } = render(
      <DicePair
        displayValues={[6, 6]}
        isRolling
        scope="dock"
        speedDieFace={SpeedDieFace.Bus}
      />
    );

    const faces = Array.from(container.querySelectorAll('.die-face'));
    expect(faces).toHaveLength(3);
    faces.forEach((face) => expect(face).toHaveClass('is-rolling'));
  });
});
