import type { GameCommandType } from '../../../domain/types/game.enums';
import type { PlayerId, SpaceId } from '../../../domain/types/game.interfaces';
import { formatMoney } from '../../../shared/utils/money.utils';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerActionRow } from '../panels/panels.interfaces';
import { SideDrawer } from './SideDrawer';

interface ActionPickerSheetProps {
  currencySymbol: string;
  /** The row that was tapped, or null when nothing is being picked. */
  row: PlayerActionRow | null;
  onClose: () => void;
  onPickSite: (command: GameCommandType, spaceId: SpaceId) => void;
  onPickOpponent: (playerId: PlayerId) => void;
}

/**
 * What to do the thing to.
 *
 * The rail offers an action; every property command needs a `spaceId`, and
 * this is where one comes from. It lists ONLY what the command will accept -
 * the eligibility is `getSiteActions`, so nothing here can be refused - with
 * the amount at stake beside each, because "which of my sites" is not a
 * question a player can answer without knowing what each one costs or pays.
 *
 * Trade is the exception and lists opponents, because a deal needs somebody to
 * make it with rather than one of your own squares. With exactly one solvent
 * opponent there is no choice to make, and the caller opens the builder
 * directly instead.
 *
 * Built on SideDrawer rather than a new surface: the backdrop, Escape, the
 * close button and the inset below the header are all already right there.
 */
export function ActionPickerSheet({
  currencySymbol,
  row,
  onClose,
  onPickSite,
  onPickOpponent,
}: ActionPickerSheetProps) {
  if (!row) {
    return null;
  }

  const isTrade = row.action === null;

  return (
    <SideDrawer
      eyebrow={isTrade ? 'Offer a deal' : row.label}
      isOpen
      isSheet
      onClose={onClose}
      testId={TEST_IDS.actionPicker}
      title={isTrade ? 'Who with?' : 'Which one?'}
    >
      <ul className="site-choice-list">
        {isTrade
          ? (row.opponents ?? []).map((opponent) => (
              <li key={opponent.playerId}>
                <button
                  className="secondary-button"
                  data-testid={`${TEST_IDS.actionPickerChoice}-${opponent.playerId}`}
                  onClick={() => onPickOpponent(opponent.playerId)}
                  type="button"
                >
                  <span className="site-choice-name">{opponent.name}</span>
                </button>
              </li>
            ))
          : row.sites.map((site) => (
              <li key={site.spaceId}>
                <button
                  className="secondary-button"
                  data-testid={`${TEST_IDS.actionPickerChoice}-${site.spaceId}`}
                  onClick={() => onPickSite(site.command, site.spaceId)}
                  type="button"
                >
                  <span className="site-choice-name">{site.name}</span>
                  <span className="site-choice-amount">
                    {formatMoney(site.amount, currencySymbol)}
                  </span>
                </button>
              </li>
            ))}
      </ul>
    </SideDrawer>
  );
}
