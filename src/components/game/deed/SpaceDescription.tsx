import { GO_SALARY_DISPLAY_AMOUNT } from '../../../domain/constants/display.constants';
import { SpaceKind } from '../../../domain/types/game.enums';
import type { BoardSpace } from '../../../domain/types/game.interfaces';
import { formatMoney } from '../../../shared/utils/money.utils';

interface SpaceDescriptionProps {
  currencySymbol: string;
  space: BoardSpace;
}

const DECK_COPY =
  'Land here to draw the top card, follow its instruction immediately, then return it to the bottom of its deck. Get Out of Jail Free cards are kept until used or traded.';

/**
 * Explanatory copy for spaces that have no rent table.
 * A lookup keyed by kind, so adding a space kind is one entry rather than
 * another branch in the modal.
 */
const describe = (space: BoardSpace, currencySymbol: string): string | null => {
  switch (space.kind) {
    case SpaceKind.Chance:
    case SpaceKind.CommunityChest:
      return DECK_COPY;
    case SpaceKind.Tax:
      return `Pay the Bank ${formatMoney(space.amount, currencySymbol)}.`;
    case SpaceKind.Go:
      return `Collect ${formatMoney(GO_SALARY_DISPLAY_AMOUNT, currencySymbol)} when you land on or pass GO.`;
    case SpaceKind.FreeParking:
      return 'Free Parking has no effect in this ruleset.';
    case SpaceKind.Jail:
      return 'Just visiting is safe. Players sent here must use a jail exit option on their turn.';
    case SpaceKind.GoToJail:
      return 'Move directly to Jail. Do not collect salary for passing GO.';
    default:
      return null;
  }
};

export function SpaceDescription({ currencySymbol, space }: SpaceDescriptionProps) {
  const copy = describe(space, currencySymbol);
  if (!copy) {
    return null;
  }
  return <p className="detail-copy">{copy}</p>;
}
