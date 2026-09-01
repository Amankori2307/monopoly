import {
  getColorGroupProgress,
  getGroupedHoldings,
  getMortgagedCount,
  getNetWorth,
  getPlayerOwnedSpaces,
} from '../../domain/rules/holdings.utils';
import {} from '../../domain/rules/buildings.utils';
import { getTradableSites } from '../../domain/rules/trade.utils';
import { selectDecisionViewModel } from './decisionViewModel.selectors';

export { selectDecisionViewModel } from './decisionViewModel.selectors';
import {
  GameStatus,
  PendingDecisionType,
  TurnPhase,
} from '../../domain/types/game.enums';
import type {
  GameState,
  PlayerId,
  PlayerState,
  ThemeConfig,
  ThemeToken,
} from '../../domain/types/game.interfaces';
import type {
  TradeBuilderViewModel,
  TradePartyViewModel,
} from '../../components/game/trade/trade.interfaces';
import type { PlayerSummary } from '../../components/game/panels/panels.interfaces';

/**
 * Pure derivations from GameState. Unit-testable without React, and the single
 * place that knows how raw state maps onto what the screen shows.
 */

export const selectActivePlayer = (game: GameState): PlayerState =>
  game.players[game.playerOrder[game.activePlayerIndex]];

export const makeTokenFinder =
  (theme: ThemeConfig | undefined) =>
  (tokenId: string): ThemeToken | undefined =>
    theme?.tokenCatalog.find((token) => token.id === tokenId);

/**
 * Turn order rotated so the active player comes first, then whoever plays next.
 * The card stack shows position rather than a separate "active" marker, so this
 * ordering is what tells you whose turn it is.
 */
export const selectPlayerOrderFromActive = (game: GameState): PlayerId[] => {
  const { playerOrder, activePlayerIndex } = game;
  return [
    ...playerOrder.slice(activePlayerIndex),
    ...playerOrder.slice(0, activePlayerIndex),
  ];
};

export const selectPlayerSummaries = (
  game: GameState,
  theme: ThemeConfig | undefined
): PlayerSummary[] => {
  const findToken = makeTokenFinder(theme);
  return selectPlayerOrderFromActive(game).map((playerId) => {
    const player = game.players[playerId];
    return {
      player,
      token: findToken(player.tokenId),
      propertyCount: getPlayerOwnedSpaces(game, playerId).length,
      netWorth: getNetWorth(game, playerId),
      mortgagedCount: getMortgagedCount(game, playerId),
      setProgress: getColorGroupProgress(game, playerId),
    };
  });
};

export const selectCanEndTurn = (game: GameState) =>
  // A finished game leaves the phase at TurnComplete, which would otherwise
  // read as "you may end your turn" - and the engine throws on every command
  // once the game is complete, so the control has to go.
  game.status === GameStatus.InProgress &&
  (game.turn.phase === TurnPhase.TurnComplete ||
    game.turn.phase === TurnPhase.AwaitExtraRollOrEnd);

/**
 * Decisions that must be answered before anything else can happen.
 * A jail choice is deliberately NOT one: a jailed player always has jail actions
 * available, so it never blocks.
 */
const BLOCKING_DECISIONS: ReadonlySet<PendingDecisionType> = new Set([
  PendingDecisionType.LandedUnownedProperty,
  PendingDecisionType.AuctionBid,
  PendingDecisionType.CardDraw,
  PendingDecisionType.AssetLiquidation,
  PendingDecisionType.TradeResponse,
  PendingDecisionType.BankruptcyResolution,
  PendingDecisionType.SpeedDieBus,
  PendingDecisionType.SpeedDieDestination,
  PendingDecisionType.BuildingPlacement,
  PendingDecisionType.GameOver,
]);

const hasBlockingDecision = (game: GameState) =>
  BLOCKING_DECISIONS.has(game.pendingDecision.type);

export const selectCanRollDice = (game: GameState) => {
  const player = selectActivePlayer(game);

  if (player.isBankrupt || hasBlockingDecision(game)) {
    return false;
  }
  // A jailed player's roll is a decision action, not a dock action. The jail
  // panel offers it, because that panel's own backdrop covers the dock - an
  // enabled-but-unclickable roll button there was how "try for doubles" came to
  // be unreachable in the first place. They still always have something to do:
  // the decision itself, which selectHasAvailableAction counts.
  if (player.inJail) {
    return false;
  }
  return game.turn.phase === TurnPhase.AwaitRoll;
};

/**
 * True when the player has nothing at all they can do. Should never happen -
 * it is a deadlock - so it is logged loudly wherever it is observed.
 */
export const selectHasAvailableAction = (game: GameState) =>
  selectCanRollDice(game) ||
  selectCanEndTurn(game) ||
  selectDecisionViewModel(game) !== null;

/** A player's holdings grouped for the holdings drawer. */
export const selectGroupedHoldings = (game: GameState, playerId: PlayerId) =>
  getGroupedHoldings(game, playerId);

/**
 * Both sides of a trade the active player is assembling.
 *
 * Built here rather than in the component because it needs the board, the
 * ownership record and the theme's token colours - none of which a
 * presentational component may reach for.
 */
export const selectTradeBuilder = (
  game: GameState,
  findToken: (tokenId: string) => ThemeToken | undefined,
  recipientPlayerId: PlayerId
): TradeBuilderViewModel | null => {
  const proposer = selectActivePlayer(game);
  const recipient = game.players[recipientPlayerId];
  if (!recipient || recipient.id === proposer.id || recipient.isBankrupt) {
    return null;
  }

  const party = (player: PlayerState): TradePartyViewModel => ({
    playerId: player.id,
    name: player.name,
    color: findToken(player.tokenId)?.color ?? '',
    cash: player.cash,
    jailCards: player.jailFreeCards.length,
    sites: getTradableSites(game, player.id),
  });

  return { proposer: party(proposer), recipient: party(recipient) };
};
