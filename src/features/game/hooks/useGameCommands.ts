import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import type { DecisionHandlers } from '../../../components/game/panels/panels.interfaces';
import { GameCommandType } from '../../../domain/types/game.enums';
import { runGameCommand } from '../gameSlice';
import { setAuctionBidInput } from '../uiSlice';

export interface UseGameCommandsResult {
  auctionBidInput: number;
  decisionHandlers: DecisionHandlers;
  endTurn: () => void;
  rollDice: (isJailRoll: boolean) => void;
}

/**
 * Binds every command the game screen can dispatch. Grouping them here keeps
 * GamePage declarative and gives the handlers one place to change.
 */
export const useGameCommands = (): UseGameCommandsResult => {
  const dispatch = useAppDispatch();
  const auctionBidInput = useAppSelector((state) => state.ui.auctionBidInput);

  return useMemo(
    () => ({
      auctionBidInput,
      endTurn: () => dispatch(runGameCommand({ type: GameCommandType.EndTurn })),
      rollDice: (isJailRoll: boolean) =>
        dispatch(
          runGameCommand({
            type: isJailRoll
              ? GameCommandType.AttemptJailRoll
              : GameCommandType.RollTurnDice,
          })
        ),
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
      },
    }),
    [auctionBidInput, dispatch]
  );
};
