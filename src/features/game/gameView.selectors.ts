import { getPlayerOwnedSpaces } from '../../domain/rules/playerActions.utils';
import { isOwnableSpace } from '../../domain/rules/space.utils';
import { PendingDecisionType, TurnPhase } from '../../domain/types/game.enums';
import type {
  GameState,
  PlayerId,
  PlayerState,
  ThemeConfig,
  ThemeToken,
} from '../../domain/types/game.interfaces';
import type {
  DecisionViewModel,
  HoldingEntry,
  PlayerSummary,
} from '../../components/game/panels/panels.interfaces';

/**
 * Pure derivations from GameState. Unit-testable without React, and the single
 * place that knows how raw state maps onto what the screen shows.
 */

export const selectActivePlayer = (game: GameState): PlayerState =>
  game.players[game.playerOrder[game.activePlayerIndex]];

export const selectPlayersByPosition = (game: GameState): Map<number, PlayerState[]> => {
  const byPosition = new Map<number, PlayerState[]>();
  for (const playerId of game.playerOrder) {
    const player = game.players[playerId];
    const existing = byPosition.get(player.position);
    if (existing) {
      existing.push(player);
    } else {
      byPosition.set(player.position, [player]);
    }
  }
  return byPosition;
};

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
      propertyCount: Object.values(game.ownership).filter(
        (ownership) => ownership.ownerPlayerId === playerId
      ).length,
    };
  });
};

export const selectHoldings = (game: GameState, playerId: PlayerId): HoldingEntry[] =>
  getPlayerOwnedSpaces(game, playerId).map((space) => ({
    space,
    ownership: game.ownership[space.id],
  }));

export const selectCanEndTurn = (game: GameState) =>
  game.turn.phase === TurnPhase.TurnComplete ||
  game.turn.phase === TurnPhase.AwaitExtraRollOrEnd;

export const selectIsJailRoll = (game: GameState) =>
  game.pendingDecision.type === PendingDecisionType.JailChoice;

export const selectCanRollDice = (game: GameState) =>
  game.turn.phase === TurnPhase.AwaitRoll || selectIsJailRoll(game);

/**
 * Builds the decision view model, or null when nothing is pending.
 * Returns null for decision types with no UI yet, which is why GamePage still
 * needs a fallback - see docs/features/game-turn.md.
 */
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
    case PendingDecisionType.AuctionBid: {
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
        minimumBid: Math.max(
          auction.startPrice,
          auction.highestBid + auction.minIncrement
        ),
        auction,
      };
    }
    case PendingDecisionType.JailChoice:
      return {
        type: PendingDecisionType.JailChoice,
        playerName: activePlayer.name,
        canUseJailCard: activePlayer.jailFreeCards > 0,
      };
    case PendingDecisionType.AssetLiquidation:
      return {
        type: PendingDecisionType.AssetLiquidation,
        playerName: game.players[decision.playerId]?.name ?? activePlayer.name,
        amountDue: decision.amountDue,
        playerId: decision.playerId,
      };
    default:
      return null;
  }
};
