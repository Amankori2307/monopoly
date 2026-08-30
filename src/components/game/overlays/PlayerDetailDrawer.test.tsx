import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { isOwnableSpace, isStreetSpace } from '../../../domain/rules/space.utils';
import type { HoldingsSection } from '../../../domain/rules/holdings.utils';
import { indiaEditionTheme } from '../../../domain/themes/indiaEditionTheme';
import { ColorGroup, SpaceKind } from '../../../domain/types/game.enums';
import type { OwnableSpace } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerSummary } from '../panels/panels.interfaces';
import { PlayerDetailDrawer } from './PlayerDetailDrawer';

const streetsIn = (group: ColorGroup) =>
  indiaEditionBoard.filter(
    (space) => isStreetSpace(space) && space.colorGroup === group
  ) as OwnableSpace[];

const railways = indiaEditionBoard.filter(
  (space) => isOwnableSpace(space) && space.kind === SpaceKind.Railway
) as OwnableSpace[];

const section = (overrides: Partial<HoldingsSection>): HoldingsSection => ({
  id: ColorGroup.Brown,
  label: 'Brown',
  colorGroup: ColorGroup.Brown,
  spaces: streetsIn(ColorGroup.Brown),
  owned: 2,
  total: 2,
  isComplete: true,
  ...overrides,
});

const summary: PlayerSummary = {
  player: {
    id: 'player-1',
    name: 'Asha',
    tokenId: 'elephant',
    cash: 700,
    position: 12,
    inJail: false,
    jailTurnsServed: 0,
    jailFreeCards: 0,
    isBankrupt: false,
    bankruptcyRank: null,
  },
  token: indiaEditionTheme.tokenCatalog[0],
  propertyCount: 2,
  netWorth: 1820,
  mortgagedCount: 1,
  setProgress: [],
};

const renderDrawer = (sections: HoldingsSection[]) =>
  render(
    <PlayerDetailDrawer
      currencySymbol="M"
      onClose={vi.fn()}
      sections={sections}
      summary={summary}
    />
  );

describe('PlayerDetailDrawer', () => {
  it('renders nothing without a player', () => {
    const { container } = render(
      <PlayerDetailDrawer
        currencySymbol="M"
        onClose={vi.fn()}
        sections={[]}
        summary={null}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the headline stats', () => {
    renderDrawer([]);

    expect(screen.getByText('M1820')).toBeInTheDocument();
    expect(screen.getByText('M700')).toBeInTheDocument();
  });

  // Position was dropped from the card for being a number nobody acts on; the
  // drawer must match.
  it('does not show board position', () => {
    renderDrawer([]);

    expect(screen.queryByText('Position')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is owned', () => {
    renderDrawer([]);

    expect(screen.getByText('No owned assets yet.')).toBeInTheDocument();
  });

  it('renders a section per group, with a full title deed per site', () => {
    renderDrawer([section({})]);

    const group = screen.getByTestId(`${TEST_IDS.holdingsSection}-brown`);
    expect(within(group).getByText('Brown')).toBeInTheDocument();
    // A deed, not a plain row.
    expect(within(group).getAllByTestId(TEST_IDS.spaceCard)).toHaveLength(2);
    expect(within(group).getAllByTestId(TEST_IDS.rentSchedule).length).toBeGreaterThan(0);
  });

  it('shows set progress and a monopoly marker on a complete set', () => {
    renderDrawer([section({})]);

    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByTestId(`${TEST_IDS.holdingsMonopoly}-brown`)).toBeInTheDocument();
  });

  it('shows no monopoly marker on a partial set', () => {
    renderDrawer([
      section({ spaces: [streetsIn(ColorGroup.Brown)[0]], owned: 1, isComplete: false }),
    ]);

    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(
      screen.queryByTestId(`${TEST_IDS.holdingsMonopoly}-brown`)
    ).not.toBeInTheDocument();
  });

  it('keeps sections in the order given', () => {
    renderDrawer([
      section({}),
      section({
        id: 'railway',
        label: 'Railways',
        colorGroup: undefined,
        spaces: railways,
        owned: railways.length,
        total: railways.length,
      }),
    ]);

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Brown', 'Railways']);
  });
});
