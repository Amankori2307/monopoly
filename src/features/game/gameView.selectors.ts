import {
  getColorGroupProgress,
  getGroupedHoldings,
  getMortgageableSites,
  getMortgagedCount,
  getNetWorth,
  getPlayerOwnedSpaces,
  getRaisableCash,
} from '../../domain/rules/holdings.utils';
import { isOwnableSpace } from '../../domain/rules/space.utils';
import {
  DeckName,
  GameStatus,
  PendingDecisionType,
  TurnPhase,
} from '../../domain/types/game.enums';
import type {
  GameState,
  PendingDecisionAssetLiquidation,
  PendingDecisionCardDraw,
  PlayerId,
  PlayerState,
  ThemeConfig,
  ThemeToken,
} from '../../domain/types/game.interfaces';
import type {
  AuctionDecisionViewModel,
  CardDrawDecisionViewModel,
  LiquidationDecisionViewModel,
  DecisionViewModel,
  PlayerSummary,
} from '../../components/game/panels/panels.interfaces';

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
  PendingDecisionType.GameOver,
]);

const hasBlockingDecision = (game: GameState) =>
  BLOCKING_DECISIONS.has(game.pendingDecision.type);

/**
 * Derived from the player, not from `pendingDecision`.
 *
 * The flag and the player's `inJail` can drift apart, and when they did the UI
 * offered a plain roll that the engine rejected - and later, once that roll was
 * guarded, offered nothing at all and deadlocked. The player's own state is the
 * fact that matters.
 */
export const selectIsJailRoll = (game: GameState) => selectActivePlayer(game).inJail;

export const selectCanRollDice = (game: GameState) => {
  const player = selectActivePlayer(game);

  if (player.isBankrupt || hasBlockingDecision(game)) {
    return false;
  }
  // A jailed player rolls for doubles until their turn is done.
  if (player.inJail) {
    return game.turn.phase !== TurnPhase.TurnComplete;
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

/**
 * Builds the decision view model, or null when nothing is pending.
 * Returns null for decision types with no UI yet, which is why GamePage still
 * needs a fallback - see docs/features/game-turn.md.
 */
const jailDecision = (activePlayer: PlayerState): DecisionViewModel => ({
  type: PendingDecisionType.JailChoice,
  playerName: activePlayer.name,
  canUseJailCard: activePlayer.jailFreeCards > 0,
});

const auctionDecision = (game: GameState): AuctionDecisionViewModel | null => {
  const auction = game.auctionState;
  if (!auction) {
    return null;
  }
  const bidderId = auction.activeBidderOrder[auction.activeBidderIndex];
  const space = game.board.find((candidate) => candidate.id === auction.spaceId);
  return {
    type: PendingDecisionType.AuctionBid,
    spaceName: space?.name ?? '',
    activeBidderName: game.players[bidderId]?.name ?? '',
    highestBid: auction.highestBid,
    minimumBid: Math.max(auction.startPrice, auction.highestBid + auction.minIncrement),
    auction,
  };
};

/**
 * Everything the liquidation panel needs to be self-contained.
 *
 * The decision modal covers the board, so a player raising cash cannot reach the
 * site panel - the mortgageable sites travel with the decision instead.
 */
const liquidationDecision = (
  game: GameState,
  decision: PendingDecisionAssetLiquidation,
  activePlayer: PlayerState
): LiquidationDecisionViewModel => {
  const debtor = game.players[decision.playerId] ?? activePlayer;

  return {
    type: PendingDecisionType.AssetLiquidation,
    playerName: debtor.name,
    amountDue: decision.amountDue,
    playerId: decision.playerId,
    creditorName: decision.creditorPlayerId
      ? (game.players[decision.creditorPlayerId]?.name ?? null)
      : null,
    reason: decision.reason,
    mortgageableSites: getMortgageableSites(game, decision.playerId),
    canSettle: debtor.cash >= decision.amountDue,
    // Bankrupt when the debt is beyond cash plus everything mortgageable - not
    // merely when they would rather not pay.
    isBankrupt:
      debtor.cash + getRaisableCash(game, decision.playerId) < decision.amountDue,
  };
};

const cardDrawDecision = (
  game: GameState,
  decision: PendingDecisionCardDraw,
  activePlayer: PlayerState
): CardDrawDecisionViewModel => ({
  type: PendingDecisionType.CardDraw,
  playerName: game.players[decision.playerId]?.name ?? activePlayer.name,
  deckLabel: decision.deck === DeckName.Chance ? 'Chance' : 'Community Chest',
  cardTitle: decision.card.title,
  cardDescription: decision.card.description,
});

export const selectDecisionViewModel = (game: GameState): DecisionViewModel | null => {
  const decision = game.pendingDecision;
  const activePlayer = selectActivePlayer(game);

  switch (decision.type) {
    case PendingDecisionType.LandedUnownedProperty: {
      const space = game.board.find((candidate) => candidate.id === decision.spaceId);
      if (!space || !isOwnableSpace(space)) {
        return null;
      }
      return {
        type: PendingDecisionType.LandedUnownedProperty,
        playerName: activePlayer.name,
        space,
      };
    }
    case PendingDecisionType.AuctionBid:
      return auctionDecision(game);
    case PendingDecisionType.JailChoice:
      return jailDecision(activePlayer);
    case PendingDecisionType.CardDraw:
      return cardDrawDecision(game, decision, activePlayer);
    case PendingDecisionType.AssetLiquidation:
      return liquidationDecision(game, decision, activePlayer);
    case PendingDecisionType.GameOver:
      return {
        type: PendingDecisionType.GameOver,
        winnerName: game.winnerPlayerId
          ? (game.players[game.winnerPlayerId]?.name ?? '')
          : '',
      };
    default:
      // Falls through to the jail check below, so a jailed player always has
      // actions even if `pendingDecision` drifted away from `jail-choice`.
      break;
  }

  return activePlayer.inJail ? jailDecision(activePlayer) : null;
};

/** A player's holdings grouped for the holdings drawer. */
export const selectGroupedHoldings = (game: GameState, playerId: PlayerId) =>
  getGroupedHoldings(game, playerId);
