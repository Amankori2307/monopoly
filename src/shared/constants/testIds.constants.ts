/**
 * Stable hooks for tests. Prefer an accessible query (role + name) when the
 * element has one - it tests what a user perceives. Reach for a test id when
 * there is no accessible handle, or when a query would otherwise depend on
 * copy that is expected to change.
 *
 * Never reference a raw string in a test; import from here so a rename is a
 * single compiler-checked edit.
 */
export const TEST_IDS = {
  // Layout
  gameLayout: 'game-layout',
  actionRail: 'action-rail',
  boardGrid: 'board-grid',
  gameSidebar: 'game-sidebar',

  // Board
  boardCenter: 'board-center',
  boardSpace: 'board-space',
  spaceColorBar: 'space-color-bar',
  boardTokenLayer: 'board-token-layer',
  spacePlayerToken: 'space-player-token',

  // Overlays
  decisionModal: 'decision-modal',
  activityButton: 'activity-button',
  activityDrawer: 'activity-drawer',
  playerDetailDrawer: 'player-detail-drawer',
  drawerClose: 'drawer-close',

  // Panels
  turnPanel: 'turn-panel',
  deedMortgaged: 'deed-mortgaged',
  siteActions: 'site-actions',
  siteAction: 'site-action',
  siteOwner: 'site-owner',
  proposeTradeButton: 'propose-trade-button',
  spaceOwnerDot: 'space-owner-dot',
  toast: 'toast',
  toastStack: 'toast-stack',
  liquidationDecision: 'liquidation-decision',
  liquidationMortgage: 'liquidation-mortgage',
  liquidationSettle: 'liquidation-settle',
  liquidationDeadEnd: 'liquidation-dead-end',
  declareBankruptcy: 'declare-bankruptcy',
  gameOverDecision: 'game-over-decision',
  gameOverHome: 'game-over-home',
  cardDrawDecision: 'card-draw-decision',
  acknowledgeCardButton: 'acknowledge-card-button',
  decisionPanel: 'decision-panel',
  playersPanel: 'players-panel',
  playerStack: 'player-stack',
  playerStackToggle: 'player-stack-toggle',
  playerStackExpand: 'player-stack-expand',
  playerCard: 'player-card',
  playerBadge: 'player-badge',
  playerNetWorth: 'player-net-worth',
  playerSiteCount: 'player-site-count',
  colorGroupPips: 'color-group-pips',
  colorGroupPip: 'color-group-pip',
  holdingsStack: 'holdings-stack',
  holdingsStackCard: 'holdings-stack-card',
  holdingsFeatured: 'holdings-featured',
  holdingsPanel: 'holdings-panel',
  activityPanel: 'activity-panel',
  hintsPanel: 'hints-panel',
  commandError: 'command-error',

  // Controls
  turnControls: 'turn-controls',
  diceDock: 'dice-dock',
  dieFace: 'die-face',
  rollButton: 'roll-button',
  endTurnButton: 'end-turn-button',
  propertyActionButton: 'property-action-button',

  // Space detail
  spaceDetailCard: 'space-detail-card',
  spaceCard: 'space-card',
  buyDecision: 'buy-decision',
  buyButton: 'buy-button',
  declineButton: 'decline-button',
  deedBand: 'deed-band',
  rentSchedule: 'rent-schedule',

  // Setup
  playerCountInput: 'player-count-input',
  setupForm: 'setup-form',
  recentGamesList: 'recent-games-list',
  recentGameItem: 'recent-game-item',
} as const;

export type TestId = (typeof TEST_IDS)[keyof typeof TEST_IDS];

/**
 * Builds a scoped id for a repeated element, e.g. `board-space-12`.
 * Keeps per-item ids consistent instead of ad-hoc template strings.
 */
export const scopedTestId = (base: TestId, suffix: string | number) =>
  `${base}-${suffix}`;
