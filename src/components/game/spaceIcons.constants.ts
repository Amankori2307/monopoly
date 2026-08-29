import freeParkingIcon from '../../assets/images/board-corners/free-parking.svg';
import goToJailIcon from '../../assets/images/board-corners/go-to-jail.svg';
import goIcon from '../../assets/images/board-corners/go.svg';
import justVisitingIcon from '../../assets/images/board-corners/just-visiting.svg';
import chanceIcon from '../../assets/images/board-icons/chance.svg';
import communityChestIcon from '../../assets/images/board-icons/community-chest.svg';
import electricCompanyIcon from '../../assets/images/board-icons/electric-company.svg';
import railwayIcon from '../../assets/images/board-icons/railway.svg';
import superTaxIcon from '../../assets/images/board-icons/super-tax.svg';
import taxIcon from '../../assets/images/board-icons/tax.svg';
import waterWorksIcon from '../../assets/images/board-icons/water-works.svg';
import { SpaceKind } from '../../domain/types/game.enums';
import type { BoardSpace } from '../../domain/types/game.interfaces';

/**
 * Icon lookup shared by the board cell and the title-deed modal. Both used to
 * carry their own copy of this map plus an identical special-case ternary.
 */

export const CORNER_ICONS: Partial<Record<SpaceKind, string>> = {
  [SpaceKind.Go]: goIcon,
  [SpaceKind.FreeParking]: freeParkingIcon,
  [SpaceKind.Jail]: justVisitingIcon,
  [SpaceKind.GoToJail]: goToJailIcon,
};

const KIND_ICONS: Partial<Record<SpaceKind, string>> = {
  [SpaceKind.Railway]: railwayIcon,
  [SpaceKind.CommunityChest]: communityChestIcon,
  [SpaceKind.Chance]: chanceIcon,
  [SpaceKind.Tax]: taxIcon,
  [SpaceKind.Utility]: waterWorksIcon,
};

/**
 * Two spaces need an icon that differs from their kind's default. Keyed by name
 * because the board data has no finer discriminator for them.
 */
const NAME_ICON_OVERRIDES: Record<string, string> = {
  'Electric Company': electricCompanyIcon,
  'Super Tax': superTaxIcon,
};

export const getSpaceIcon = (space: BoardSpace): string | undefined =>
  NAME_ICON_OVERRIDES[space.name] ?? KIND_ICONS[space.kind];

export const getCornerIcon = (space: BoardSpace): string | undefined =>
  CORNER_ICONS[space.kind];
