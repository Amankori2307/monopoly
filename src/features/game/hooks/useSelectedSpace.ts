import { useCallback, useMemo, useState } from 'react';
import type { BoardSpace, SpaceId } from '../../../domain/types/game.interfaces';

export interface UseSelectedSpaceResult {
  clearSelection: () => void;
  selectSpace: (spaceId: SpaceId) => void;
  selectedSpace: BoardSpace | null;
}

/** Tracks which board space has its title deed open. */
export const useSelectedSpace = (board: BoardSpace[]): UseSelectedSpaceResult => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<SpaceId | null>(null);

  const selectedSpace = useMemo(
    () => board.find((space) => space.id === selectedSpaceId) ?? null,
    [board, selectedSpaceId]
  );

  return {
    clearSelection: useCallback(() => setSelectedSpaceId(null), []),
    selectSpace: useCallback((spaceId: SpaceId) => setSelectedSpaceId(spaceId), []),
    selectedSpace,
  };
};
