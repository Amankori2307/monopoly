import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import type { Toast } from '../../../components/game/overlays/overlays.interfaces';
import type {
  BidFieldState,
  DecisionHandlers,
} from '../../../components/game/panels/panels.interfaces';
import type { MortgageChoice } from '../../../domain/types/game.enums';
import type { TradeState } from '../../../domain/types/game.interfaces';
import { GameCommandType } from '../../../domain/types/game.enums';
import { runGameCommand, setCommandError } from '../gameSlice';
import { dismissToast, setAuctionBidInput } from '../uiSlice';
import { auctionBidKey, selectBidField } from '../auctionViewModel.selectors';

export interface UseGameCommandsResult {
  /** The auction bid field, prefilled and guarded. Null with no auction open. */
  bidField: BidFieldState | null;
  decisionHandlers: DecisionHandlers;
  dismissError: () => void;
  dismissToast: (toastId: string) => void;
  endTurn: () => void;
  rollDice: () => void;
  /** Sends an assembled offer to the other player. */
  proposeTrade: (payload: TradeState) => void;
  /** A property command for one picked space, from the site panel. */
  runPropertyCommand: (command: GameCommandType, spaceId: string) => void;
  toasts: Toast[];
}

/**
 * Binds every command the game screen can dispatch. Grouping them here keeps
 * GamePage declarative and gives the handlers one place to change.
 */
export const useGameCommands = (): UseGameCommandsResult => {
  const dispatch = useAppDispatch();
  const typedBid = useAppSelector((state) => state.ui.auctionBidInput);
  const auction = useAppSelector((state) => state.game.activeGame?.auctionState ?? null);
  const bidderCash = useAppSelector((state) => {
    const game = state.game.activeGame;
    const bidderId = auction?.activeBidderOrder[auction.activeBidderIndex];
    return bidderId ? (game?.players[bidderId]?.cash ?? 0) : 0;
  });
  const toasts = useAppSelector((state) => state.ui.toasts);
  // The field is derived, not stored: an untouched field holds the minimum legal
  // bid, so this is also the amount Submit sends.
  const bidField = auction ? selectBidField(auction, bidderCash, typedBid) : null;

  return useMemo(
    () => ({
      bidField,
      toasts,
      dismissError: () => dispatch(setCommandError(null)),
      runPropertyCommand: (command: GameCommandType, spaceId: string) =>
        // The command union types spaceId per member, so the cast is where the
        // picked space meets the typed command rather than spread through the UI.
        dispatch(
          runGameCommand({ type: command, spaceId } as Parameters<
            typeof runGameCommand
          >[0])
        ),
      dismissToast: (toastId: string) => dispatch(dismissToast(toastId)),
      endTurn: () => dispatch(runGameCommand({ type: GameCommandType.EndTurn })),
      rollDice: () => dispatch(runGameCommand({ type: GameCommandType.RollTurnDice })),
      proposeTrade: (payload: TradeState) =>
        dispatch(runGameCommand({ type: GameCommandType.ProposeTrade, payload })),
      decisionHandlers: {
        onBuy: () => dispatch(runGameCommand({ type: GameCommandType.BuyLandedAsset })),
        onDecline: () =>
          dispatch(runGameCommand({ type: GameCommandType.DeclineLandedAsset })),
        onBid: () => {
          if (!bidField) {
            return;
          }
          dispatch(
            runGameCommand({
              type: GameCommandType.SubmitAuctionBid,
              amount: bidField.amount,
            })
          );
        },
        // Tagged with the moment it was typed at, so it goes stale by itself
        // once a bid lands or the turn passes to the next bidder.
        onBidAmountChange: (amount: number) => {
          if (auction) {
            dispatch(setAuctionBidInput({ key: auctionBidKey(auction), amount }));
          }
        },
        onPass: () => dispatch(runGameCommand({ type: GameCommandType.PassAuction })),
        onPayJailFine: () =>
          dispatch(runGameCommand({ type: GameCommandType.PayJailFine })),
        onUseJailCard: () =>
          dispatch(runGameCommand({ type: GameCommandType.UseJailFreeCard })),
        // The same command the dice dock sends. The panel needs its own way in
        // because the decision backdrop covers the dock - which is what made
        // trying for doubles unreachable.
        onAttemptJailRoll: () =>
          dispatch(runGameCommand({ type: GameCommandType.AttemptJailRoll })),
        onAcknowledgeCard: () =>
          dispatch(runGameCommand({ type: GameCommandType.AcknowledgeCard })),
        onMortgageSite: (spaceId: string) =>
          dispatch(runGameCommand({ type: GameCommandType.MortgageAsset, spaceId })),
        // A hotel and a house are separate commands, and the panel knows which
        // one is standing on the site.
        onSellBuilding: (spaceId: string, isHotel: boolean) =>
          dispatch(
            runGameCommand({
              type: isHotel ? GameCommandType.SellHotel : GameCommandType.SellHouse,
              spaceId,
            })
          ),
        onSettleDebt: () =>
          dispatch(runGameCommand({ type: GameCommandType.SettleDebt })),
        onDeclareBankruptcy: () =>
          dispatch(runGameCommand({ type: GameCommandType.ConfirmBankruptcy })),
        onAcceptTrade: (mortgageChoices: Record<string, MortgageChoice>) =>
          dispatch(
            runGameCommand({ type: GameCommandType.AcceptTrade, mortgageChoices })
          ),
        onRejectTrade: () =>
          dispatch(runGameCommand({ type: GameCommandType.RejectTrade })),
        onChooseBuildingSite: (spaceId: string) =>
          dispatch(runGameCommand({ type: GameCommandType.ChooseBuildingSite, spaceId })),
        onChooseBusMove: (steps: number) =>
          dispatch(runGameCommand({ type: GameCommandType.ChooseBusMove, steps })),
        onChooseDestination: (spaceId: string) =>
          dispatch(
            runGameCommand({
              type: GameCommandType.ChooseSpeedDieDestination,
              spaceId,
            })
          ),
      },
    }),
    [auction, bidField, dispatch, toasts]
  );
};
