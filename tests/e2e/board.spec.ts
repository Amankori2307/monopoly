import { expect, test } from '@playwright/test';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { CORNERS, startGame } from './helpers';

test('shows a title deed with the street colour band and rent schedule', async ({
  page,
}) => {
  await startGame(page);

  // Delhi is dark blue - the band must carry the street's colour, not the panel's.
  await page.getByRole('button', { name: 'View details for Delhi', exact: true }).click();

  const card = page.getByTestId(TEST_IDS.spaceDetailCard);
  await expect(card).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.rentSchedule)).toBeVisible();

  const band = page.getByTestId(TEST_IDS.deedBand);
  await expect(band).toHaveClass(/group-dark-blue/);
  await expect(band).toHaveCSS('background-color', 'rgb(49, 80, 182)');
});

// Corner spaces render one fewer child than street spaces (no colour bar). A row
// template that assumes the bar squeezes the corner title into it and clips the
// label, which is how the corners were previously misaligned.
test('renders every corner space square, aligned, and labelled', async ({ page }) => {
  await startGame(page);

  for (const corner of CORNERS) {
    const cell = page.getByTestId(scopedTestId(TEST_IDS.boardSpace, corner.index));
    await expect(cell).toBeVisible();
    await expect(cell).toContainText(corner.label);

    const box = await cell.boundingBox();
    if (!box) {
      throw new Error(`Corner "${corner.label}" has no layout box`);
    }
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
  }

  // A corner must line up with its row neighbour rather than floating.
  const go = await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, 0)).boundingBox();
  const neighbour = await page
    .getByTestId(scopedTestId(TEST_IDS.boardSpace, 1))
    .boundingBox();
  if (!go || !neighbour) {
    throw new Error('GO or its row neighbour has no layout box');
  }
  expect(
    Math.abs(go.y + go.height - (neighbour.y + neighbour.height))
  ).toBeLessThanOrEqual(1);
});

// Board cells carry no padding so a street's colour ribbon runs edge to edge,
// and the divider must paint ABOVE that ribbon - an inset shadow on the cell
// itself sits under its children and would be hidden by the ribbon.
test('runs the street colour ribbon edge to edge with no cell padding', async ({
  page,
}) => {
  await startGame(page);

  const geometry = await page.evaluate(() => {
    const cell = document.querySelector('.board-space.space-street');
    const bar = cell?.querySelector('.space-color');
    if (!cell || !bar) {
      return null;
    }
    const cellBox = cell.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    return {
      padding: getComputedStyle(cell).padding,
      widthDelta: Math.abs(cellBox.width - barBox.width),
      topDelta: Math.abs(cellBox.top - barBox.top),
      radius: getComputedStyle(bar).borderRadius,
      dividerShadow: getComputedStyle(cell, '::after').boxShadow,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry?.padding).toBe('0px');
  expect(geometry?.widthDelta).toBeLessThanOrEqual(0.5);
  expect(geometry?.topDelta).toBeLessThanOrEqual(0.5);
  expect(geometry?.radius).toBe('0px');
  // The separator is still drawn, just on the layer above the ribbon.
  expect(geometry?.dividerShadow).toContain('inset');
});

// Every boundary on the board must carry exactly one line. The rule is "each
// element draws its own right and bottom edge"; the grid closes the board's top
// and left. The centre has to follow that rule too - it owns the right column's
// left edge and the bottom row's top edge, and those were the only two
// boundaries left undrawn.
test('draws a consistent divider on every board boundary', async ({ page }) => {
  await startGame(page);

  const dividers = await page.evaluate(() => {
    const shadowOf = (element: Element, pseudo?: string) =>
      getComputedStyle(element, pseudo).boxShadow;
    const cells = Array.from(document.querySelectorAll('.board-space'));
    const center = document.querySelector('.board-center');
    const grid = document.querySelector('.board-grid');
    return {
      cellCount: cells.length,
      everyCellHasDivider: cells.every((cell) =>
        shadowOf(cell, '::after').includes('inset')
      ),
      dividerValues: Array.from(new Set(cells.map((cell) => shadowOf(cell, '::after')))),
      centerShadow: center ? shadowOf(center) : null,
      gridShadow: grid ? shadowOf(grid) : null,
    };
  });

  expect(dividers.cellCount).toBe(40);
  expect(dividers.everyCellHasDivider).toBe(true);
  // One rule for all 40 cells, so no side is treated differently.
  expect(dividers.dividerValues).toHaveLength(1);
  // The centre draws its right and bottom like a cell...
  expect(dividers.centerShadow).toContain('-1px -1px');
  // ...and the grid closes the opposite two sides of the board.
  expect(dividers.gridShadow).toContain('1px 1px');
});

// Occupied cells used to be ringed in red, and hovering added a second red ring.
test('shows no coloured outline on hovered or occupied cells', async ({ page }) => {
  await startGame(page);

  // GO always holds at least one token at the start of a game.
  const occupied = page.getByTestId(scopedTestId(TEST_IDS.boardSpace, 0));
  await expect(occupied).toHaveClass(/active-space/);
  await expect(occupied).toHaveCSS('outline-style', 'none');

  await occupied.hover();
  const hovered = await occupied.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
  });

  expect(hovered.outlineStyle).toBe('none');
  // Only the neutral divider remains - no accent-coloured ring.
  expect(hovered.boxShadow).not.toMatch(/rgb\(200, 65, 50\)|rgb\(213, 63, 50\)/);
});

test('applies the active theme to the board via data-theme', async ({ page }) => {
  await startGame(page);

  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'india-edition');
  await expect(page.getByTestId(TEST_IDS.spaceColorBar).first()).toHaveClass(/group-/);
});

// On a printed board the colour ribbon always runs along the cell's short side,
// on the edge facing the centre: bottom row hugs its top, top row its bottom,
// left column its right, right column its left.
test('puts every colour ribbon on the inner edge of its cell', async ({ page }) => {
  await startGame(page);

  const ribbons = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.board-space'));
    return cells
      .map((cell) => {
        const bar = cell.querySelector('.space-color');
        if (!bar) {
          return null;
        }
        const c = cell.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        const side = Array.from(cell.classList).find((name) => name.startsWith('side-'));
        const horizontal = b.width > b.height;
        return {
          side,
          horizontal,
          hugsTop: Math.abs(b.top - c.top) < 1,
          hugsBottom: Math.abs(b.bottom - c.bottom) < 1,
          hugsLeft: Math.abs(b.left - c.left) < 1,
          hugsRight: Math.abs(b.right - c.right) < 1,
          spansShortSide: horizontal
            ? Math.abs(b.width - c.width) < 1
            : Math.abs(b.height - c.height) < 1,
        };
      })
      .filter(Boolean);
  });

  // 22 streets carry a ribbon; the other 18 spaces do not.
  expect(ribbons).toHaveLength(22);

  const innerEdge: Record<string, keyof (typeof ribbons)[number]> = {
    'side-bottom': 'hugsTop',
    'side-top': 'hugsBottom',
    'side-left': 'hugsRight',
    'side-right': 'hugsLeft',
  };

  for (const ribbon of ribbons) {
    if (!ribbon || !ribbon.side) {
      throw new Error('Ribbon is missing its side class');
    }
    // Runs along the short side, full bleed.
    expect(ribbon.spansShortSide).toBe(true);
    // Top and bottom rows band horizontally; side columns band vertically.
    expect(ribbon.horizontal).toBe(
      ribbon.side === 'side-bottom' || ribbon.side === 'side-top'
    );
    // And it sits on the edge facing the board centre.
    expect(ribbon[innerEdge[ribbon.side]]).toBe(true);
  }
});

// Space names run along the cell's LONG axis. Left and right column cells are
// landscape so horizontal text already does; top and bottom rows are portrait,
// so their names are set vertically instead of wrapping across the short side.
test('runs space names along the long axis of each cell', async ({ page }) => {
  await startGame(page);

  const writingModes = await page.evaluate(() => {
    const read = (selector: string) => {
      const name = document
        .querySelector(selector)
        ?.querySelector('.space-label .space-name');
      return name ? getComputedStyle(name).writingMode : null;
    };
    return {
      bottom: read('.side-bottom:not(.corner-space)'),
      top: read('.side-top:not(.corner-space)'),
      left: read('.side-left:not(.corner-space)'),
      right: read('.side-right:not(.corner-space)'),
      corner: (() => {
        const name = document
          .querySelector('.corner-space')
          ?.querySelector('.corner-title .space-name');
        return name ? getComputedStyle(name).writingMode : null;
      })(),
    };
  });

  // Portrait cells: vertical text.
  expect(writingModes.bottom).toBe('vertical-rl');
  expect(writingModes.top).toBe('vertical-rl');
  // Landscape cells: horizontal text already runs the long way.
  expect(writingModes.left).toBe('horizontal-tb');
  expect(writingModes.right).toBe('horizontal-tb');
  // Corners are square and stay upright.
  expect(writingModes.corner).toBe('horizontal-tb');
});

// Long names must wrap into further lines instead of being clipped -
// "Chennai Central Railway Station" and "Bhubaneshwar" both used to overflow.
test('never clips a space name', async ({ page }) => {
  await startGame(page);

  const clipped = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.board-space'))
      .map((cell) => {
        const name =
          cell.querySelector('.space-label .space-name') ??
          cell.querySelector('.corner-title .space-name');
        if (!name) {
          return null;
        }
        const overflows =
          name.scrollWidth > name.clientWidth + 1 ||
          name.scrollHeight > name.clientHeight + 1;
        return overflows ? name.textContent : null;
      })
      .filter(Boolean)
  );

  expect(clipped).toEqual([]);
});

// Each cell reads ribbon -> icon -> text from the board centre outward, and the
// icon turns with the text so the cell reads as one unit.
test('orders and rotates the icon to match the text', async ({ page }) => {
  await startGame(page);

  const perSide = await page.evaluate(() => {
    const innerEdge: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
      'side-bottom': 'top',
      'side-top': 'bottom',
      'side-left': 'right',
      'side-right': 'left',
    };

    return Object.keys(innerEdge).map((side) => {
      const cell = Array.from(
        document.querySelectorAll(`.${side}:not(.corner-space)`)
      ).find((candidate) => candidate.querySelector('.space-icon'));
      const icon = cell?.querySelector('.space-icon');
      const name = cell?.querySelector('.space-name');
      if (!cell || !icon || !name) {
        return { side, found: false };
      }

      const c = cell.getBoundingClientRect();
      const distance = (element: Element) => {
        const r = element.getBoundingClientRect();
        return {
          top: r.top - c.top,
          bottom: c.bottom - r.bottom,
          left: r.left - c.left,
          right: c.right - r.right,
        }[innerEdge[side]];
      };

      return {
        side,
        found: true,
        iconNearerRibbon: distance(icon) < distance(name),
        rotation: getComputedStyle(icon).rotate,
      };
    });
  });

  const bySide = Object.fromEntries(perSide.map((entry) => [entry.side, entry]));

  for (const entry of perSide) {
    expect(entry.found).toBe(true);
    expect(entry.iconNearerRibbon).toBe(true);
  }

  // Vertical text rows turn their icons; horizontal side columns leave them upright.
  expect(bySide['side-bottom'].rotation).toBe('-90deg');
  expect(bySide['side-top'].rotation).toBe('90deg');
  expect(bySide['side-left'].rotation).toBe('none');
  expect(bySide['side-right'].rotation).toBe('none');
});

// The design system is deliberately sharp: no surface has rounded corners,
// including elements that would conventionally be circular.
test('renders every surface with square corners', async ({ page }) => {
  await startGame(page);

  const rounded = await page.evaluate(() => {
    // Physical game pieces are the documented exception: a pawn, a die, and its
    // pips are real objects, not UI surfaces. Nothing else may be round.
    const physicalPieces = ['token-chip', 'die-face', 'pip'];
    return Array.from(document.querySelectorAll('body *'))
      .filter(
        (element) => !physicalPieces.some((name) => element.classList.contains(name))
      )
      .filter((element) => {
        const radius = getComputedStyle(element).borderRadius;
        return radius !== '' && radius !== '0px';
      })
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`)
      .slice(0, 10);
  });

  expect(rounded).toEqual([]);
});

// The exclusion above only proves the pieces are allowed to be round. This
// proves they actually are - otherwise squaring the dice again would still pass.
test('renders the dice as real dice: rounded face, circular pips', async ({ page }) => {
  await startGame(page);

  const shapes = await page.evaluate(() => {
    const radiusOf = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).borderRadius : null;
    };
    return {
      die: radiusOf('.die-face'),
      pip: radiusOf('.pip'),
      rollButton: radiusOf('.dice-roll-button'),
    };
  });

  // Rounded like a real die - but not a circle.
  expect(shapes.die).not.toBe('0px');
  expect(shapes.die).not.toBe('50%');
  // Dots are circles.
  expect(shapes.pip).toBe('50%');
  // The exception must not leak into UI controls.
  expect(shapes.rollButton).toBe('0px');
});

// Cards used to size to their content - a street (7 rent rows) was 507px, a
// railway 362, a utility 294, a tax card 111 - so the card jumped as you moved
// around the board. Every space kind now renders at one height.
test('renders every space card at the same height', async ({ page }) => {
  await startGame(page);

  // Selected by board index: names like "Chance" appear three times.
  const measure = async (index: number) => {
    await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, index)).click();
    const card = page.getByTestId(TEST_IDS.spaceCard);
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    await page.getByRole('button', { name: 'Close space details' }).click();
    await expect(card).toHaveCount(0);
    return box ? Math.round(box.height) : 0;
  };

  // One of every kind: street, railway, utility, tax, both decks, and a corner.
  const samples = {
    'street (Mumbai)': 39,
    'railway (Howrah)': 15,
    'utility (Electric Company)': 12,
    'tax (Income Tax)': 4,
    chance: 7,
    'community chest': 2,
    'corner (Free Parking)': 20,
  };

  const heights: Record<string, number> = {};
  for (const [label, index] of Object.entries(samples)) {
    heights[label] = await measure(index);
  }

  expect(new Set(Object.values(heights)).size, JSON.stringify(heights)).toBe(1);
});

// Tokens are drawn over the board, not inside the space cells. In the flow an
// occupied cell grew taller than its neighbours and shifted the whole board.
test('draws player tokens as an overlay that cannot resize a cell', async ({ page }) => {
  await startGame(page);

  await expect(page.getByTestId(TEST_IDS.boardTokenLayer)).toBeVisible();

  // No token lives inside a board space.
  expect(await page.locator('.board-space .token-chip').count()).toBe(0);
  expect(await page.locator('.board-token-layer .token-chip').count()).toBeGreaterThan(0);

  // Every ordinary cell on a side is the same size, occupied or not. Corners sit
  // on the wider track, so they are measured separately by their own test.
  const sizes = await page.evaluate(() => {
    const bySide: Record<string, string[]> = {};
    const cells = Array.from(document.querySelectorAll('.board-space')).filter(
      (cell) => !cell.classList.contains('corner-space')
    );
    for (const cell of cells) {
      const side = Array.from(cell.classList).find((name) => name.startsWith('side-'));
      if (!side) continue;
      const box = cell.getBoundingClientRect();
      (bySide[side] ??= []).push(`${Math.round(box.width)}x${Math.round(box.height)}`);
    }
    return bySide;
  });

  for (const [side, dimensions] of Object.entries(sizes)) {
    expect(
      new Set(dimensions).size,
      `${side} cells differ: ${[...new Set(dimensions)].join(', ')}`
    ).toBe(1);
  }
});

// The token walks space by space so the move is legible, rather than teleporting.
test('walks the token one space at a time after a roll', async ({ page }) => {
  await startGame(page);

  // Tokens are absolutely positioned, so their space shows in left/top.
  const cellOfFirstToken = () =>
    page.evaluate(() => {
      const token = document.querySelector<HTMLElement>('.board-token-layer .token-chip');
      return token ? `${token.style.left},${token.style.top}` : null;
    });

  const rollButton = page.getByTestId(TEST_IDS.rollButton);
  const endTurnButton = page.getByTestId(TEST_IDS.endTurnButton);
  const declineButton = page.getByTestId(TEST_IDS.declineButton);

  // Real dice, and a card can cancel out a move, so retry until a walk happens.
  let visited: string[] = [];
  for (let attempt = 0; attempt < 8 && visited.length <= 2; attempt += 1) {
    if (await declineButton.isVisible()) {
      await declineButton.click();
    } else if (!(await rollButton.isEnabled())) {
      if (await endTurnButton.isVisible()) await endTurnButton.click();
      continue;
    } else {
      visited = [(await cellOfFirstToken()) ?? ''];
      await rollButton.click();
      for (let sample = 0; sample < 80; sample += 1) {
        await page.waitForTimeout(40);
        const cell = await cellOfFirstToken();
        if (cell && cell !== visited[visited.length - 1]) {
          visited.push(cell);
        }
      }
      if (visited.length <= 2 && (await endTurnButton.isVisible())) {
        await endTurnButton.click();
      }
    }
  }

  // More than one intermediate cell means it walked rather than teleported.
  expect(visited.length, `cells visited: ${visited.join(' -> ')}`).toBeGreaterThan(2);
});

// Tokens must stay legible over any street colour while they move.
test('draws tokens as shaded spheres in each player’s colour', async ({ page }) => {
  await startGame(page);

  const token = page.getByTestId(/^space-player-token-/).first();
  await expect(token).toBeVisible();

  const style = await token.evaluate((element) => {
    const computed = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      width: Math.round(box.width),
      height: Math.round(box.height),
      position: computed.position,
      background: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      radius: computed.borderRadius,
      boxShadow: computed.boxShadow,
      timing: computed.transitionTimingFunction,
      duration: computed.transitionDuration,
    };
  });

  // Small pieces, but round and solid rather than the old faint chip.
  expect(style.width).toBeGreaterThanOrEqual(11);
  expect(style.height).toBe(style.width);
  // A round, shaded piece in the player's own colour - not white, not square.
  expect(style.radius).toBe('50%');
  expect(style.background).not.toBe('rgb(255, 255, 255)');
  expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
  // Sphere shading: gradients plus inset highlight and shade.
  expect(style.backgroundImage).toContain('radial-gradient');
  expect(style.boxShadow).toContain('inset');
  // No outer ring around the piece - only inset shading and the cast shadow.
  const outerShadows = style.boxShadow
    .split(/,(?![^(]*\))/)
    .filter((shadow) => !shadow.includes('inset'));
  expect(outerShadows.every((shadow) => !shadow.includes('255, 255, 255'))).toBe(true);
  // Absolutely positioned so movement is a transition, not a grid jump.
  expect(style.position).toBe('absolute');
  // Fast out, slow across, fast in.
  expect(style.timing).toContain('cubic-bezier(0.45, 1, 0.55, 0)');
  expect(style.duration).not.toBe('0s');
});

// Colour is the only thing distinguishing pieces now, so it must differ per player.
test('gives each player a distinct token colour', async ({ page }) => {
  await startGame(page);

  const colours = await page
    .getByTestId(/^space-player-token-/)
    .evaluateAll((tokens) =>
      tokens.map((token) => getComputedStyle(token).backgroundColor)
    );

  expect(colours.length).toBeGreaterThan(1);
  expect(new Set(colours).size).toBe(colours.length);
});
