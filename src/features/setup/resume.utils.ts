import { TableMode } from '../../domain/types/game.enums';
import { TABLE_MESSAGES } from '../multiplayer/multiplayer.constants';

/**
 * Why a saved game cannot be reopened, or null.
 *
 * The `*BlockedReason` shape: one pure function that both disables the control
 * and supplies the sentence, so a live button is always something that will
 * work. An online save on a device that never held the code is the case worth
 * catching - the state is right there on disk and completely unplayable,
 * because reading or writing the table needs the code.
 */
export const resumeBlockedReason = (
  tableMode: TableMode,
  hasJoinCode: boolean
): string | null =>
  tableMode === TableMode.Online && !hasJoinCode ? TABLE_MESSAGES.codeLost : null;
