import { useCallback, useState } from 'react';
import type { PlayerActionRow } from '../../../components/game/panels/panels.interfaces';
import type { PlayerId, SpaceId } from '../../../domain/types/game.interfaces';

export interface UseGameOverlaysResult {
  closeAll: () => void;
  closeActivity: () => void;
  closePlayer: () => void;
  clearSpace: () => void;
  isActivityOpen: boolean;
  openActivity: () => void;
  openPlayer: (playerId: PlayerId) => void;
  selectSpace: (spaceId: SpaceId) => void;
  selectedPlayerId: PlayerId | null;
  selectedSpaceId: SpaceId | null;
  /** Who the active player is building an offer for, when they are. */
  tradeTargetPlayerId: PlayerId | null;
  openTrade: (playerId: PlayerId) => void;
  closeTrade: () => void;
  /**
   * The rail button being answered - "which of my sites?" - or null.
   *
   * The whole row rather than just the action, because the picker lists that
   * row's own eligible sites and there is nothing to gain from looking them
   * up a second time in a different place.
   */
  actionPickerRow: PlayerActionRow | null;
  openActionPicker: (row: PlayerActionRow) => void;
  closeActionPicker: () => void;
}

/**
 * Which overlay is showing: the activity drawer, a player's details, or a board
 * space's title deed. Only one drawer is open at a time, so opening one closes
 * the other.
 */
export const useGameOverlays = (): UseGameOverlaysResult => {
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerId | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<SpaceId | null>(null);
  const [tradeTargetPlayerId, setTradeTargetPlayerId] = useState<PlayerId | null>(null);
  const [actionPickerRow, setActionPickerRow] = useState<PlayerActionRow | null>(null);

  const openActivity = useCallback(() => {
    setSelectedPlayerId(null);
    setIsActivityOpen(true);
  }, []);

  const openPlayer = useCallback((playerId: PlayerId) => {
    setIsActivityOpen(false);
    setSelectedPlayerId(playerId);
  }, []);

  // The builder replaces the site panel it was opened from: both are modal, and
  // the deed behind the offer would only be in the way.
  const openTrade = useCallback((playerId: PlayerId) => {
    setSelectedSpaceId(null);
    // Whichever way the builder was reached, the picker that led there is done.
    setActionPickerRow(null);
    setTradeTargetPlayerId(playerId);
  }, []);

  return {
    isActivityOpen,
    selectedPlayerId,
    selectedSpaceId,
    tradeTargetPlayerId,
    actionPickerRow,
    openTrade,
    openActivity,
    openPlayer,
    closeActivity: useCallback(() => setIsActivityOpen(false), []),
    closePlayer: useCallback(() => setSelectedPlayerId(null), []),
    selectSpace: useCallback((spaceId: SpaceId) => setSelectedSpaceId(spaceId), []),
    clearSpace: useCallback(() => setSelectedSpaceId(null), []),
    closeTrade: useCallback(() => setTradeTargetPlayerId(null), []),
    openActionPicker: useCallback(
      (row: PlayerActionRow) => {
        // Trade with exactly one solvent opponent asks a question with one
        // answer, so it does not ask: the builder opens straight away. That is
        // the two-player game, which is most of them. A property action always
        // shows its list, even at one site - the amount beside the name is
        // half of why the list is there.
        const only = row.action === null ? (row.opponents ?? []) : [];
        if (only.length === 1) {
          openTrade(only[0].playerId);
          return;
        }
        setActionPickerRow(row);
      },
      [openTrade]
    ),
    closeActionPicker: useCallback(() => setActionPickerRow(null), []),
    closeAll: useCallback(() => {
      setIsActivityOpen(false);
      setSelectedPlayerId(null);
      setSelectedSpaceId(null);
      setTradeTargetPlayerId(null);
      setActionPickerRow(null);
    }, []),
  };
};
