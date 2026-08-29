import type { BoardSpace } from '../../domain/types/game';
import railwayIcon from '../../assets/images/board-icons/railway.svg';
import communityChestIcon from '../../assets/images/board-icons/community-chest.svg';
import chanceIcon from '../../assets/images/board-icons/chance.svg';
import waterWorksIcon from '../../assets/images/board-icons/water-works.svg';
import electricCompanyIcon from '../../assets/images/board-icons/electric-company.svg';
import taxIcon from '../../assets/images/board-icons/tax.svg';
import superTaxIcon from '../../assets/images/board-icons/super-tax.svg';

interface SpaceDetailCardProps {
  currencySymbol: string;
  onClose: () => void;
  space: BoardSpace | null;
}

const formatMoney = (amount: number, currencySymbol: string) =>
  `${currencySymbol}${amount}`;

const detailIcons: Partial<Record<BoardSpace['kind'], string>> = {
  railway: railwayIcon,
  chance: chanceIcon,
  'community-chest': communityChestIcon,
  utility: waterWorksIcon,
  tax: taxIcon,
};

const streetColors: Record<string, string> = {
  brown: '#8d5a2b',
  'light-blue': '#8fd3ff',
  pink: '#ef6fb0',
  orange: '#f08c2e',
  red: '#d13232',
  yellow: '#e7c947',
  green: '#2a9d5b',
  'dark-blue': '#3150b6',
};

export function SpaceDetailCard({ currencySymbol, onClose, space }: SpaceDetailCardProps) {
  if (!space) {
    return null;
  }

  const icon = space.kind === 'utility' && space.name === 'Electric Company'
    ? electricCompanyIcon
    : space.kind === 'tax' && space.name === 'Super Tax'
      ? superTaxIcon
      : detailIcons[space.kind];
  const title = space.kind === 'street' ? 'Title deed' : 'Board space';

  return (
    <div className="space-detail-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="space-detail-title"
        aria-modal="true"
        className={`space-detail-card detail-${space.kind}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Close space details" className="space-detail-close" onClick={onClose} type="button">
          x
        </button>
        <p className="eyebrow">{title}</p>
        <div className="space-detail-title-row">
          {icon ? <img alt="" aria-hidden="true" className="space-detail-icon" src={icon} /> : null}
          <h2 id="space-detail-title">{space.name}</h2>
        </div>

        {space.kind === 'street' ? (
          <>
            <div
              className="deed-band"
              style={{ background: streetColors[space.colorGroup] ?? '#bd9637' }}
            />
            <div className="deed-primary-stats">
              <span>Site value<strong>{formatMoney(space.price, currencySymbol)}</strong></span>
              <span>Mortgage value<strong>{formatMoney(space.mortgageValue, currencySymbol)}</strong></span>
            </div>
            <p className="deed-rent-title">Rent schedule</p>
            <dl className="rent-schedule">
              <div><dt>Rent</dt><dd>{formatMoney(space.rents.baseRent, currencySymbol)}</dd></div>
              <div><dt>With whole colour set</dt><dd>{formatMoney(space.rents.monopolyRent, currencySymbol)}</dd></div>
              <div><dt>With 1 house</dt><dd>{formatMoney(space.rents.with1House, currencySymbol)}</dd></div>
              <div><dt>With 2 houses</dt><dd>{formatMoney(space.rents.with2Houses, currencySymbol)}</dd></div>
              <div><dt>With 3 houses</dt><dd>{formatMoney(space.rents.with3Houses, currencySymbol)}</dd></div>
              <div><dt>With 4 houses</dt><dd>{formatMoney(space.rents.with4Houses, currencySymbol)}</dd></div>
              <div><dt>With hotel</dt><dd>{formatMoney(space.rents.withHotel, currencySymbol)}</dd></div>
            </dl>
            <div className="deed-footer">
              Houses: {formatMoney(space.houseCost, currencySymbol)} each
              <span>Hotels: {formatMoney(space.hotelCost, currencySymbol)} each</span>
            </div>
          </>
        ) : null}

        {space.kind === 'railway' ? (
          <>
            <div className="deed-primary-stats">
              <span>Site value<strong>{formatMoney(space.price, currencySymbol)}</strong></span>
              <span>Mortgage value<strong>{formatMoney(space.mortgageValue, currencySymbol)}</strong></span>
            </div>
            <p className="deed-rent-title">Rent by stations owned</p>
            <dl className="rent-schedule">
              {space.rentByCount.map((rent, index) => (
                <div key={rent}><dt>{index + 1} railway{index === 0 ? '' : 's'}</dt><dd>{formatMoney(rent, currencySymbol)}</dd></div>
              ))}
            </dl>
          </>
        ) : null}

        {space.kind === 'utility' ? (
          <>
            <div className="deed-primary-stats">
              <span>Site value<strong>{formatMoney(space.price, currencySymbol)}</strong></span>
              <span>Mortgage value<strong>{formatMoney(space.mortgageValue, currencySymbol)}</strong></span>
            </div>
            <p className="detail-copy">Rent is based on the dice roll.</p>
            <dl className="rent-schedule">
              <div><dt>One utility owned</dt><dd>{space.rentMultiplierOne}x dice</dd></div>
              <div><dt>Both utilities owned</dt><dd>{space.rentMultiplierBoth}x dice</dd></div>
            </dl>
          </>
        ) : null}

        {space.kind === 'community-chest' || space.kind === 'chance' ? (
          <p className="detail-copy">Land here to draw the top card, follow its instruction immediately, then return it to the bottom of its deck. Get Out of Jail Free cards are kept until used or traded.</p>
        ) : null}

        {space.kind === 'tax' ? <p className="detail-copy">Pay the Bank {formatMoney(space.amount, currencySymbol)}.</p> : null}
        {space.kind === 'go' ? <p className="detail-copy">Collect {formatMoney(200, currencySymbol)} when you land on or pass GO.</p> : null}
        {space.kind === 'free-parking' ? <p className="detail-copy">Free Parking has no effect in this ruleset.</p> : null}
        {space.kind === 'jail' ? <p className="detail-copy">Just visiting is safe. Players sent here must use a jail exit option on their turn.</p> : null}
        {space.kind === 'go-to-jail' ? <p className="detail-copy">Move directly to Jail. Do not collect salary for passing GO.</p> : null}
      </section>
    </div>
  );
}
