import { DeckName, PendingDecisionType, TurnPhase } from '../../domain/types/game.enums';
import type {
  GameState,
  PendingDecisionAssetLiquidation,
  PendingDecisionBuildingPlacement,
  PendingDecisionCardDraw,
  PendingDecisionSpeedDieBus,
  PendingDecisionTrade,
  PlayerId,
  PlayerState,
} from '../../domain/types/game.interfaces';
import type {
  BuildingPlacementDecisionViewModel,
  HoldingEntry,
  BuyDecisionViewModel,
  SpeedDieBusDecisionViewModel,
  CardDrawDecisionViewModel,
  DecisionViewModel,
  GameOverDecisionViewModel,
  LiquidationDecisionViewModel,
  TradeResponseDecisionViewModel,
} from '../../components/game/panels/panels.interfaces';
import {
  getLiquidationValue,
  getPlacementSites,
  getSellableBuildings,
} from '../../domain/rules/buildings.utils';
import { getMortgageableSites } from '../../domain/rules/holdings.utils';
import { isOwnableSpace } from '../../domain/rules/space.utils';
import { getMortgageTransferFee, getTransferFees } from '../../domain/rules/trade.utils';
import { selectAuctionDecision } from './auctionViewModel.selectors';
import { selectActivePlayer } from './gameView.selectors';
import type { TokenFinder } from './gameView.interfaces';

/**
 * One view model per pending decision.
 *
 * Split out of gameView.selectors.ts, which the building auction pushed past
 * its line limit - the same seam decisions.interfaces.ts took. A new decision
 * type still needs its five edits; see CLAUDE.md section 4.
 */

/**
 * Builds the decision view model, or null when nothing is pending.
 * Returns null for decision types with no UI yet, which is why GamePage still
 * needs a fallback - see docs/features/game-turn.md.
 */
const jailDecision = (game: GameState, activePlayer: PlayerState): DecisionViewModel => ({
  type: PendingDecisionType.JailChoice,
  playerName: activePlayer.name,
  canUseJailCard: activePlayer.jailFreeCards.length > 0,
  attemptsUsed: activePlayer.jailTurnsServed,
  lastRoll: game.turn.lastRoll,
});

/**
 * True while a jailed player still has this turn's action to take.
 *
 * A failed attempt ends the turn, and offering the panel afterwards would show
 * three buttons the engine rejects - and keep its backdrop over the End Turn
 * button, which is the only thing left to do. The panel returns on their next
 * turn, which advanceToNextTurn starts in AwaitDecision.
 */
const canActFromJail = (game: GameState): boolean =>
  game.turn.phase === TurnPhase.AwaitDecision || game.turn.phase === TurnPhase.AwaitRoll;

/**
 * The jail choice, or nothing if this turn's attempt is already spent.
 *
 * Shared by the explicit `jail-choice` case and the fallback beneath the switch,
 * which is what lets a jailed player be offered their options even when
 * `pendingDecision` has drifted away from the flag.
 */
const jailDecisionIfActionable = (
  game: GameState,
  activePlayer: PlayerState
): DecisionViewModel | null =>
  activePlayer.inJail && canActFromJail(game) ? jailDecision(game, activePlayer) : null;

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
    // Buildings first: a site whose colour set holds any cannot be mortgaged,
    // so without this the panel would offer a hotel owner nothing at all.
    sellableBuildings: getSellableBuildings(game, decision.playerId),
    canSettle: debtor.cash >= decision.amountDue,
    // Bankrupt when the debt is beyond cash plus everything mortgageable - not
    // merely when they would rather not pay.
    isBankrupt:
      debtor.cash + getLiquidationValue(game, decision.playerId) < decision.amountDue,
    queuedDebtCount: decision.queued?.length ?? 0,
  };
};

/**
 * The pending trade, in words, from the recipient's point of view.
 *
 * "Incoming" and "outgoing" rather than "offered" and "requested": the panel is
 * read by the recipient, and the proposer's language would be backwards there.
 */
const tradeResponseDecision = (
  game: GameState,
  decision: PendingDecisionTrade
): TradeResponseDecisionViewModel | null => {
  const trade = game.tradeState;
  if (!trade) return null;

  /** The deeds moving, so the accept screen can show real title deeds. */
  const deedsOf = (spaceIds: string[]): HoldingEntry[] =>
    spaceIds.flatMap((spaceId) => {
      const space = game.board.find((candidate) => candidate.id === spaceId);
      return space ? [{ space, ownership: game.ownership[spaceId] }] : [];
    });

  return {
    type: PendingDecisionType.TradeResponse,
    recipientName: game.players[decision.recipientPlayerId]?.name ?? 'They',
    incomingMortgaged: trade.offeredSpaceIds
      .filter((spaceId) => game.ownership[spaceId]?.mortgaged)
      .flatMap((spaceId) => {
        const space = game.board.find((candidate) => candidate.id === spaceId);
        if (!space || !('mortgageValue' in space)) return [];
        const interest = getMortgageTransferFee(space.mortgageValue);
        return [
          {
            spaceId,
            name: space.name,
            keepCost: interest,
            redeemCost: space.mortgageValue + interest,
          },
        ];
      }),
    incoming: {
      playerName: game.players[decision.proposerPlayerId]?.name ?? 'They',
      cash: trade.offeredCash,
      sites: deedsOf(trade.offeredSpaceIds),
      jailCards: trade.offeredJailCards,
      transferFee: getTransferFees(game, trade.offeredSpaceIds),
    },
    outgoing: {
      playerName: game.players[decision.recipientPlayerId]?.name ?? 'You',
      cash: trade.requestedCash,
      sites: deedsOf(trade.requestedSpaceIds),
      jailCards: trade.requestedJailCards,
      transferFee: getTransferFees(game, trade.requestedSpaceIds),
    },
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

const buyDecision = (
  game: GameState,
  spaceId: string,
  activePlayer: PlayerState
): BuyDecisionViewModel | null => {
  const space = game.board.find((candidate) => candidate.id === spaceId);
  return space && isOwnableSpace(space)
    ? {
        type: PendingDecisionType.LandedUnownedProperty,
        playerName: activePlayer.name,
        space,
      }
    : null;
};

const gameOverDecision = (game: GameState): GameOverDecisionViewModel => ({
  type: PendingDecisionType.GameOver,
  winnerName: game.winnerPlayerId ? (game.players[game.winnerPlayerId]?.name ?? '') : '',
});

/** Whose decision it is, falling back to the active player. */
const nameOfDecider = (
  game: GameState,
  playerId: PlayerId,
  activePlayer: PlayerState
): string => game.players[playerId]?.name ?? activePlayer.name;

const buildingPlacementDecision = (
  game: GameState,
  decision: PendingDecisionBuildingPlacement
): BuildingPlacementDecisionViewModel => ({
  type: PendingDecisionType.BuildingPlacement,
  playerName: game.players[decision.playerId]?.name ?? '',
  buildingKind: decision.buildingKind,
  paidAmount: decision.paidAmount,
  sites: getPlacementSites(game, decision.playerId, decision.buildingKind),
});

const busDecision = (
  game: GameState,
  decision: PendingDecisionSpeedDieBus,
  activePlayer: PlayerState
): SpeedDieBusDecisionViewModel => ({
  type: PendingDecisionType.SpeedDieBus,
  playerName: nameOfDecider(game, decision.playerId, activePlayer),
  whiteDice: decision.whiteDice,
});

/**
 * The one decision that needs more than the game state: the auction panel names
 * its bidders and wears their colours, and a token id only becomes a colour
 * through the active theme. `selectTradeBuilder` takes the same argument.
 */
export const selectDecisionViewModel = (
  game: GameState,
  findToken: TokenFinder
): DecisionViewModel | null => {
  const decision = game.pendingDecision;
  const activePlayer = selectActivePlayer(game);

  switch (decision.type) {
    case PendingDecisionType.LandedUnownedProperty:
      return buyDecision(game, decision.spaceId, activePlayer);
    case PendingDecisionType.AuctionBid:
      return selectAuctionDecision(game, findToken);
    case PendingDecisionType.JailChoice:
      return jailDecisionIfActionable(game, activePlayer);
    case PendingDecisionType.CardDraw:
      return cardDrawDecision(game, decision, activePlayer);
    case PendingDecisionType.AssetLiquidation:
      return liquidationDecision(game, decision, activePlayer);
    case PendingDecisionType.TradeResponse:
      return tradeResponseDecision(game, decision);
    case PendingDecisionType.SpeedDieBus:
      return busDecision(game, decision, activePlayer);
    case PendingDecisionType.SpeedDieDestination:
      return {
        type: PendingDecisionType.SpeedDieDestination,
        playerName: nameOfDecider(game, decision.playerId, activePlayer),
        // Any space is a legal answer, so the panel gets the whole board.
        board: game.board,
      };
    case PendingDecisionType.BuildingPlacement:
      return buildingPlacementDecision(game, decision);
    case PendingDecisionType.GameOver:
      return gameOverDecision(game);
    default:
      // Falls through to the jail check below, so a jailed player always has
      // actions even if `pendingDecision` drifted away from `jail-choice`.
      break;
  }

  return jailDecisionIfActionable(game, activePlayer);
};
