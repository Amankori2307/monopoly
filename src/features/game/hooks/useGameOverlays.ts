import { useCallback, useState } from 'react';
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
    setTradeTargetPlayerId(playerId);
  }, []);

  return {
    isActivityOpen,
    selectedPlayerId,
    selectedSpaceId,
    tradeTargetPlayerId,
    openTrade,
    openActivity,
    openPlayer,
    closeActivity: useCallback(() => setIsActivityOpen(false), []),
    closePlayer: useCallback(() => setSelectedPlayerId(null), []),
    selectSpace: useCallback((spaceId: SpaceId) => setSelectedSpaceId(spaceId), []),
    clearSpace: useCallback(() => setSelectedSpaceId(null), []),
    closeTrade: useCallback(() => setTradeTargetPlayerId(null), []),
    closeAll: useCallback(() => {
      setIsActivityOpen(false);
      setSelectedPlayerId(null);
      setSelectedSpaceId(null);
      setTradeTargetPlayerId(null);
    }, []),
  };
};
