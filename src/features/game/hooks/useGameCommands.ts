import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import type { Toast } from '../../../components/game/overlays/overlays.interfaces';
import type { DecisionHandlers } from '../../../components/game/panels/panels.interfaces';
import type { TradeState } from '../../../domain/types/game.interfaces';
import { GameCommandType } from '../../../domain/types/game.enums';
import { runGameCommand, setCommandError } from '../gameSlice';
import { dismissToast, setAuctionBidInput } from '../uiSlice';

export interface UseGameCommandsResult {
  auctionBidInput: number;
  decisionHandlers: DecisionHandlers;
  dismissError: () => void;
  dismissToast: (toastId: string) => void;
  endTurn: () => void;
  rollDice: (isJailRoll: boolean) => void;
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
  const auctionBidInput = useAppSelector((state) => state.ui.auctionBidInput);
  const toasts = useAppSelector((state) => state.ui.toasts);

  return useMemo(
    () => ({
      auctionBidInput,
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
      rollDice: (isJailRoll: boolean) =>
        dispatch(
          runGameCommand({
            type: isJailRoll
              ? GameCommandType.AttemptJailRoll
              : GameCommandType.RollTurnDice,
          })
        ),
      proposeTrade: (payload: TradeState) =>
        dispatch(runGameCommand({ type: GameCommandType.ProposeTrade, payload })),
      decisionHandlers: {
        onBuy: () => dispatch(runGameCommand({ type: GameCommandType.BuyLandedAsset })),
        onDecline: () =>
          dispatch(runGameCommand({ type: GameCommandType.DeclineLandedAsset })),
        onBid: () =>
          dispatch(
            runGameCommand({
              type: GameCommandType.SubmitAuctionBid,
              amount: auctionBidInput,
            })
          ),
        onBidAmountChange: (amount: number) => dispatch(setAuctionBidInput(amount)),
        onPass: () => dispatch(runGameCommand({ type: GameCommandType.PassAuction })),
        onPayJailFine: () =>
          dispatch(runGameCommand({ type: GameCommandType.PayJailFine })),
        onUseJailCard: () =>
          dispatch(runGameCommand({ type: GameCommandType.UseJailFreeCard })),
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
        onAcceptTrade: () =>
          dispatch(runGameCommand({ type: GameCommandType.AcceptTrade })),
        onRejectTrade: () =>
          dispatch(runGameCommand({ type: GameCommandType.RejectTrade })),
      },
    }),
    [auctionBidInput, dispatch, toasts]
  );
};
