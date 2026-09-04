import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getTokenPosition } from '../../../domain/board/boardLayout.utils';
import { JAIL_POSITION } from '../../../domain/constants/game.constants';
import { MoveDirection } from '../../../domain/types/game.enums';
import type { PlayerState, ThemeToken } from '../../../domain/types/game.interfaces';
import { indiaEditionTheme } from '../../../domain/themes/indiaEditionTheme';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { BoardTokenLayer } from './BoardTokenLayer';

/**
 * The layer's whole job is deciding where a piece stands. The maths is proven in
 * boardLayout.utils.test.ts; what is proven here is that the layer asks for the
 * right place - which for the Jail square means reading `inJail`.
 */

const findToken = (tokenId: string): ThemeToken | undefined =>
  indiaEditionTheme.tokenCatalog.find((token) => token.id === tokenId);

const player = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  id: 'p1',
  name: 'Asha',
  tokenId: 'elephant',
  cash: 1500,
  position: JAIL_POSITION,
  inJail: false,
  jailTurnsServed: 0,
  jailFreeCards: [],
  isBankrupt: false,
  bankruptcyRank: null,
  hasPassedGo: false,
  lastMove: MoveDirection.Forward,
  ...overrides,
});

const renderLayer = (players: PlayerState[]) =>
  render(<BoardTokenLayer findToken={findToken} players={players} positions={{}} />);

const placementOf = (container: HTMLElement, id: string) => {
  const chip = container.querySelector(
    `[data-testid="${scopedTestId(TEST_IDS.spacePlayerToken, id)}"]`
  ) as HTMLElement;
  return { left: chip.style.left, top: chip.style.top };
};

const expected = (crowdIndex: number, inJail: boolean) => {
  const at = getTokenPosition(JAIL_POSITION, crowdIndex, inJail);
  return { left: `${at.leftPercent}%`, top: `${at.topPercent}%` };
};

describe('BoardTokenLayer at the Jail square', () => {
  it('stands a jailed player in the cell', () => {
    const { container } = renderLayer([player({ inJail: true })]);

    expect(placementOf(container, 'p1')).toEqual(expected(0, true));
  });

  it('stands a visitor on the band', () => {
    const { container } = renderLayer([player({ inJail: false })]);

    expect(placementOf(container, 'p1')).toEqual(expected(0, false));
  });

  // The bug this whole feature exists for: the two used to land on identical
  // coordinates, told apart only by iteration order.
  it('does not put a jailed player where a visitor stands', () => {
    const { container } = renderLayer([
      player({ id: 'p1', inJail: true }),
      player({ id: 'p2', name: 'Vikram', tokenId: 'train', inJail: false }),
    ]);

    expect(placementOf(container, 'p1')).not.toEqual(placementOf(container, 'p2'));
  });

  // Crowds are counted per region, so the only visitor on the board is the
  // first visitor - not the second occupant of a cluster they are not in.
  it('gives each region its own first slot', () => {
    const { container } = renderLayer([
      player({ id: 'p1', inJail: true }),
      player({ id: 'p2', name: 'Vikram', tokenId: 'train', inJail: false }),
    ]);

    expect(placementOf(container, 'p1')).toEqual(expected(0, true));
    expect(placementOf(container, 'p2')).toEqual(expected(0, false));
  });

  it('clusters two players within one region', () => {
    const { container } = renderLayer([
      player({ id: 'p1', inJail: true }),
      player({ id: 'p2', name: 'Vikram', tokenId: 'train', inJail: true }),
    ]);

    expect(placementOf(container, 'p1')).toEqual(expected(0, true));
    expect(placementOf(container, 'p2')).toEqual(expected(1, true));
  });

  /**
   * The walk lags the engine: a player the engine has jailed is still crossing
   * the board for a second or so. Reading `inJail` alone would draw them behind
   * bars before they arrived.
   */
  it('leaves a jailed player who has not arrived yet where they are', () => {
    const { container } = render(
      <BoardTokenLayer
        findToken={findToken}
        players={[player({ inJail: true, position: 4 })]}
        positions={{ p1: 4 }}
      />
    );

    const at = getTokenPosition(4, 0, false);
    expect(placementOf(container, 'p1')).toEqual({
      left: `${at.leftPercent}%`,
      top: `${at.topPercent}%`,
    });
  });
});

describe('BoardTokenLayer', () => {
  // Tokens live in the overlay, never in a cell: one in a cell's flow makes that
  // cell taller than its neighbours and shifts the whole board.
  it('draws every token inside the overlay', () => {
    const { container } = renderLayer([
      player({ id: 'p1' }),
      player({ id: 'p2', name: 'Vikram', tokenId: 'train', position: 3 }),
    ]);

    const layer = container.querySelector('.board-token-layer');
    expect(layer?.querySelectorAll('.token-chip')).toHaveLength(2);
    expect(container.querySelectorAll('.token-chip')).toHaveLength(2);
  });
});
