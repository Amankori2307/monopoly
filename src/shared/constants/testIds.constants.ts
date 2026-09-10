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
  // The design system's own page
  stylePage: 'style-page',
  styleSwatches: 'style-swatches',

  // Layout
  gameLayout: 'game-layout',
  boardGrid: 'board-grid',
  gameSidebar: 'game-sidebar',

  // Board
  boardCenter: 'board-center',
  boardSpace: 'board-space',
  spaceColorBar: 'space-color-bar',
  spaceBuildings: 'space-buildings',
  boardTokenLayer: 'board-token-layer',
  spacePlayerToken: 'space-player-token',
  jailCell: 'jail-cell',
  jailVisitingBand: 'jail-visiting-band',

  // Overlays
  decisionModal: 'decision-modal',
  decisionSpectator: 'decision-spectator',
  lobbyPanel: 'lobby-panel',
  lobbySeats: 'lobby-seats',
  lobbySeat: 'lobby-seat',
  lobbyInviteLink: 'lobby-invite-link',
  lobbyJoinCode: 'lobby-join-code',
  lobbyClaimButton: 'lobby-claim-button',
  lobbyStartButton: 'lobby-start-button',
  lobbyBlockedReason: 'lobby-blocked-reason',
  lobbyNameInput: 'lobby-name-input',
  lobbyTokenSelect: 'lobby-token-select',
  openTableButton: 'open-table-button',
  joinCodeInput: 'join-code-input',
  joinSubmitButton: 'join-submit-button',
  joinBlockedReason: 'join-blocked-reason',
  hostForm: 'host-form',
  hostNameInput: 'host-name-input',
  hostTokenSelect: 'host-token-select',
  noServerPanel: 'no-server-panel',
  connectionBanner: 'connection-banner',
  activityButton: 'activity-button',
  activityDrawer: 'activity-drawer',
  playerDetailDrawer: 'player-detail-drawer',
  drawerClose: 'drawer-close',

  // Panels
  turnPanel: 'turn-panel',
  deedMortgaged: 'deed-mortgaged',
  spaceMortgaged: 'space-mortgaged',
  actionRail: 'action-rail',
  actionRailButton: 'action-rail-button',
  actionPicker: 'action-picker',
  actionPickerChoice: 'action-picker-choice',
  siteActions: 'site-actions',
  siteAction: 'site-action',
  siteOwner: 'site-owner',
  proposeTradeButton: 'propose-trade-button',
  tradeBuilder: 'trade-builder',
  tradeColumn: 'trade-column',
  tradeSite: 'trade-site',
  tradeDeedStack: 'trade-deed-stack',
  tradeDeed: 'trade-deed',
  tradeDeedBlocked: 'trade-deed-blocked',
  tradeJailCard: 'trade-jail-card',
  tradeCash: 'trade-cash',
  tradeJailCards: 'trade-jail-cards',
  tradePropose: 'trade-propose',
  tradeResponse: 'trade-response',
  tradeAccept: 'trade-accept',
  tradeMortgageChoices: 'trade-mortgage-choices',
  tradeMortgageKeep: 'trade-mortgage-keep',
  tradeMortgageRedeem: 'trade-mortgage-redeem',
  tradeMortgageTotal: 'trade-mortgage-total',
  tradeReject: 'trade-reject',
  spaceOwnerBar: 'space-owner-bar',
  spacePrice: 'space-price',
  toast: 'toast',
  soundToggle: 'sound-toggle',
  appearanceSelect: 'appearance-select',
  appHeader: 'app-header',
  chooserPlayLocal: 'chooser-play-local',
  chooserHostOnline: 'chooser-host-online',
  chooserJoinOnline: 'chooser-join-online',
  chooserContinue: 'chooser-continue',
  notFoundPanel: 'not-found-panel',
  settingsTrigger: 'settings-trigger',
  settingsPanel: 'settings-panel',
  appearanceToggle: 'appearance-toggle',
  liquidationDecision: 'liquidation-decision',
  liquidationMortgage: 'liquidation-mortgage',
  liquidationSell: 'liquidation-sell',
  liquidationSettle: 'liquidation-settle',
  liquidationDeadEnd: 'liquidation-dead-end',
  liquidationQueued: 'liquidation-queued',
  declareBankruptcy: 'declare-bankruptcy',
  gameOverDecision: 'game-over-decision',
  gameOverHome: 'game-over-home',
  cardDrawDecision: 'card-draw-decision',
  acknowledgeCardButton: 'acknowledge-card-button',
  decisionPanel: 'decision-panel',
  auctionDecision: 'auction-decision',
  buildingPlacement: 'building-placement',
  buildingPlacementSite: 'building-placement-site',
  bidInput: 'bid-input',
  submitBidButton: 'submit-bid-button',
  passAuctionButton: 'pass-auction-button',
  auctionLog: 'auction-log',
  auctionLogLine: 'auction-log-line',
  auctionActiveBidder: 'auction-active-bidder',
  auctionRaise: 'auction-raise',
  auctionAllIn: 'auction-all-in',
  auctionBidBlocked: 'auction-bid-blocked',
  playersPanel: 'players-panel',
  playerStack: 'player-stack',
  playerStackToggle: 'player-stack-toggle',
  playerStackExpand: 'player-stack-expand',
  playerStackCentre: 'player-stack-centre',
  playerCard: 'player-card',
  playerCash: 'player-cash',
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
  errorBoundary: 'error-boundary',

  // Controls
  turnControls: 'turn-controls',
  diceDock: 'dice-dock',
  dieFace: 'die-face',
  speedDieFace: 'speed-die-face',
  // The same throw, drawn a second time in the phone HUD's middle column. Two
  // elements answering one id is a Playwright strict-mode failure even when
  // one of them is display:none, so the second mount gets its own.
  dieFaceHud: 'die-face-hud',
  speedDieFaceHud: 'speed-die-face-hud',
  busDecision: 'bus-decision',
  busChoice: 'bus-choice',
  destinationDecision: 'destination-decision',
  destinationChoice: 'destination-choice',
  rollButton: 'roll-button',
  jailRollButton: 'jail-roll-button',
  jailDecision: 'jail-decision',
  jailAttempt: 'jail-attempt',
  endTurnButton: 'end-turn-button',

  // Space detail
  spaceDetailCard: 'space-detail-card',
  spaceCard: 'space-card',
  buyDecision: 'buy-decision',
  buyButton: 'buy-button',
  buyBlockedReason: 'buy-blocked-reason',
  declineButton: 'decline-button',
  deedBand: 'deed-band',
  rentSchedule: 'rent-schedule',

  // Setup
  playerCountInput: 'player-count-input',
  playerCountNotice: 'player-count-notice',
  speedDieToggle: 'speed-die-toggle',
  setupForm: 'setup-form',
  rulesetGlance: 'ruleset-glance',
  recentGamesList: 'recent-games-list',
  recentGameItem: 'recent-game-item',
  deleteGame: 'delete-game',
  confirmDeleteGame: 'confirm-delete-game',
} as const;

export type TestId = (typeof TEST_IDS)[keyof typeof TEST_IDS];

/**
 * Builds a scoped id for a repeated element, e.g. `board-space-12`.
 * Keeps per-item ids consistent instead of ad-hoc template strings.
 */
export const scopedTestId = (base: TestId, suffix: string | number) =>
  `${base}-${suffix}`;
