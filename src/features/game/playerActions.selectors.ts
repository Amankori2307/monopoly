import { getAssetHolderId } from '../../domain/rules/actor.utils';
import { getPlayerActionOptions } from '../../domain/rules/playerActions.utils';
import { nounsFor } from '../../domain/themes/nouns.utils';
import { PropertyAction } from '../../domain/types/game.enums';
import type { GameState, PlayerId } from '../../domain/types/game.interfaces';
import type { PlayerActionRow } from '../../components/game/panels/panels.interfaces';
import type { Viewer } from '../multiplayer/viewer.interfaces';
import { viewerControls } from '../multiplayer/viewer.utils';

/**
 * The five buttons under the board, and what each one would offer.
 *
 * Four of them are property actions asked across everything the holder owns;
 * Trade is the odd one out and needs an OPPONENT rather than one of your own
 * sites, so it lists players instead.
 *
 * The holder is `getAssetHolderId`, never the active player: during a
 * liquidation the debtor is the one raising cash, and a collect-from-each card
 * can bill somebody whose turn it is not. That is the same actor
 * `selectSitePanel` already uses, so the rail and the site panel always agree
 * about whose holdings are on offer.
 */
export const selectActionRail = (game: GameState, viewer: Viewer): PlayerActionRow[] => {
  const holderId = getAssetHolderId(game);
  const canAct = viewerControls(viewer, holderId);

  const property = getPlayerActionOptions(game, holderId ?? '').map((option) => ({
    action: option.action,
    label: option.label,
    accessibleName: accessibleNameFor(game, option.action),
    isEnabled: canAct && option.isEnabled,
    disabledReason: canAct ? option.disabledReason : notYourMove(game, holderId),
    sites: option.sites,
  }));

  return [...property, tradeRow(game, holderId, canAct)];
};

/**
 * The object the copy convention wants, kept out of the pixels.
 *
 * A rail button reads as one word because five of them share a phone's width;
 * the accessible name carries "verb plus object", in the edition's own noun.
 */
const accessibleNameFor = (game: GameState, action: PropertyAction): string => {
  const nouns = nounsFor(game.themeId);
  if (action === PropertyAction.Build) {
    return `Build on a ${nouns.site}`;
  }
  if (action === PropertyAction.Sell) {
    return 'Sell a building';
  }
  if (action === PropertyAction.Mortgage) {
    return `Mortgage a ${nouns.site}`;
  }
  return `Redeem a mortgaged ${nouns.site}`;
};

/**
 * Why this device cannot act, in the wording the rest of the game uses for it.
 *
 * A fragment with no terminal stop, like every other blocked reason, and a
 * name for anybody who is not the reader - see docs/conventions.md section 3d.
 */
const notYourMove = (game: GameState, holderId: PlayerId | null): string => {
  if (holderId === null) {
    return 'No one can act right now';
  }
  const name = game.players[holderId]?.name ?? 'Another player';
  return `It is ${name}'s move`;
};

/**
 * Trade, which is not a property action.
 *
 * It needs somebody to trade WITH, so it is enabled on the existence of a
 * solvent opponent rather than on anything the holder owns - a player with no
 * property can still ask for some.
 */
const tradeRow = (
  game: GameState,
  holderId: PlayerId | null,
  canAct: boolean
): PlayerActionRow => {
  const opponents = game.playerOrder
    .filter((playerId) => playerId !== holderId)
    .filter((playerId) => !game.players[playerId].isBankrupt)
    .map((playerId) => ({
      playerId,
      name: game.players[playerId].name,
      tokenId: game.players[playerId].tokenId,
    }));

  const noOneLeft = opponents.length === 0 ? 'Nobody is left to trade with' : '';

  return {
    action: null,
    label: 'Trade',
    accessibleName: 'Offer a deal',
    isEnabled: canAct && opponents.length > 0,
    disabledReason: canAct ? noOneLeft : notYourMove(game, holderId),
    sites: [],
    opponents,
  };
};
