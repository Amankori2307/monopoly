import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import type { HoldingsSection } from '../../../domain/rules/holdings.utils';
import { isOwnableSpace, isStreetSpace } from '../../../domain/rules/space.utils';
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

const section = (overrides: Partial<HoldingsSection> = {}): HoldingsSection => ({
  id: ColorGroup.Brown,
  label: 'Brown',
  colorGroup: ColorGroup.Brown,
  spaces: streetsIn(ColorGroup.Brown),
  owned: 2,
  total: 2,
  isComplete: true,
  ...overrides,
});

const railwaySection = (): HoldingsSection => ({
  id: 'railway',
  label: 'Railways',
  spaces: railways,
  owned: railways.length,
  total: railways.length,
  isComplete: true,
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
    jailFreeCards: [],
    isBankrupt: false,
    bankruptcyRank: null,
    hasPassedGo: false,
    lastMove: null,
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

/** Stack entries are real deeds, so read their headings rather than a row label. */
const stackTitles = () =>
  within(screen.getByTestId(TEST_IDS.holdingsStack))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);

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

  // Position was dropped from the card for being a number nobody acts on.
  it('does not show board position', () => {
    renderDrawer([]);

    expect(screen.queryByText('Position')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is owned', () => {
    renderDrawer([]);

    expect(screen.getByText('No owned assets yet.')).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.holdingsStack)).not.toBeInTheDocument();
  });

  // One deed in full; the rest collapse to titles. Rendering every deed made a
  // large portfolio an unnavigable scroll.
  it('features one deed and collapses the rest into a stack', () => {
    renderDrawer([section()]);

    const featured = screen.getByTestId(TEST_IDS.holdingsFeatured);
    expect(within(featured).getByTestId(TEST_IDS.spaceCard)).toBeInTheDocument();

    // The stack reuses the same SpaceCard component, clipped by CSS - so every
    // holding is a real deed, not a bespoke row.
    const stack = screen.getByTestId(TEST_IDS.holdingsStack);
    expect(within(stack).getAllByTestId(TEST_IDS.spaceCard)).toHaveLength(2);
    expect(stackTitles()).toHaveLength(2);
  });

  it('shows every holding’s name in the stack', () => {
    renderDrawer([section()]);

    expect(stackTitles()).toEqual(streetsIn(ColorGroup.Brown).map((s) => s.name));
  });

  // Colour grouping is conveyed by order and the colour band, not separate lists.
  it('keeps the stack in the order the sections are given', () => {
    renderDrawer([section(), railwaySection()]);

    expect(stackTitles()).toEqual([
      ...streetsIn(ColorGroup.Brown).map((space) => space.name),
      ...railways.map((space) => space.name),
    ]);
  });

  // Same fixed-size card in both places: the featured deed and every stacked
  // one are the shared SpaceCard shell, the stacked ones merely clipped by CSS.
  it('renders the featured deed and every stacked deed as the same card shell', () => {
    renderDrawer([section()]);

    const featured = within(screen.getByTestId(TEST_IDS.holdingsFeatured)).getByTestId(
      TEST_IDS.spaceCard
    );
    expect(featured).toHaveClass('deed-card');

    const stacked = within(screen.getByTestId(TEST_IDS.holdingsStack)).getAllByTestId(
      TEST_IDS.spaceCard
    );
    stacked.forEach((card) => expect(card).toHaveClass('deed-card'));
  });

  // The featured card stays in the deck rather than being lifted out of it, so
  // the stack never changes length and nothing shifts as you pick through it.
  it('keeps the featured holding in the stack', () => {
    const brown = streetsIn(ColorGroup.Brown);
    renderDrawer([section()]);

    fireEvent.click(screen.getByRole('button', { name: `Show ${brown[1].name}` }));

    expect(stackTitles()).toEqual(brown.map((space) => space.name));
  });

  it('features the first holding and marks it in the stack', () => {
    const [first] = streetsIn(ColorGroup.Brown);
    renderDrawer([section()]);

    expect(screen.getByTestId(TEST_IDS.holdingsFeatured)).toHaveTextContent(first.name);
    expect(screen.getByRole('button', { name: `Show ${first.name}` })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('promotes a stack card to the featured deed when picked', () => {
    const [first, second] = streetsIn(ColorGroup.Brown);
    renderDrawer([section()]);

    fireEvent.click(screen.getByRole('button', { name: `Show ${second.name}` }));

    expect(screen.getByTestId(TEST_IDS.holdingsFeatured)).toHaveTextContent(second.name);
    expect(screen.getByRole('button', { name: `Show ${second.name}` })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: `Show ${first.name}` })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
