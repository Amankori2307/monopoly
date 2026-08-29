import { SpaceKind } from '../../domain/types/game.enums';
import type { BoardSpace } from '../../domain/types/game.interfaces';
import { GO_SALARY_DISPLAY_AMOUNT } from '../../domain/constants/display.constants';
import { formatMoney } from '../../shared/utils/money.utils';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { useEscapeKey } from '../../shared/hooks/useEscapeKey';
import { getSpaceIcon } from './spaceIcons.constants';

interface SpaceDetailCardProps {
  currencySymbol: string;
  onClose: () => void;
  space: BoardSpace | null;
}

export function SpaceDetailCard({
  currencySymbol,
  onClose,
  space,
}: SpaceDetailCardProps) {
  useEscapeKey(Boolean(space), onClose);

  if (!space) {
    return null;
  }

  const icon = getSpaceIcon(space);
  const title = space.kind === SpaceKind.Street ? 'Title deed' : 'Board space';

  return (
    <div
      className="space-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="space-detail-title"
        aria-modal="true"
        className={`space-detail-card detail-${space.kind}`}
        data-testid={TEST_IDS.spaceDetailCard}
        role="dialog"
      >
        <button
          aria-label="Close space details"
          className="space-detail-close"
          onClick={onClose}
          type="button"
        >
          x
        </button>
        <p className="eyebrow">{title}</p>
        <div className="space-detail-title-row">
          {icon ? (
            <img alt="" aria-hidden="true" className="space-detail-icon" src={icon} />
          ) : null}
          <h2 id="space-detail-title">{space.name}</h2>
        </div>

        {space.kind === SpaceKind.Street ? (
          <>
            <div
              className={`deed-band group-${space.colorGroup}`}
              data-testid={TEST_IDS.deedBand}
            />
            <div className="deed-primary-stats">
              <span>
                Site value<strong>{formatMoney(space.price, currencySymbol)}</strong>
              </span>
              <span>
                Mortgage value
                <strong>{formatMoney(space.mortgageValue, currencySymbol)}</strong>
              </span>
            </div>
            <p className="deed-rent-title">Rent schedule</p>
            <dl className="rent-schedule" data-testid={TEST_IDS.rentSchedule}>
              <div>
                <dt>Rent</dt>
                <dd>{formatMoney(space.rents.baseRent, currencySymbol)}</dd>
              </div>
              <div>
                <dt>With whole colour set</dt>
                <dd>{formatMoney(space.rents.monopolyRent, currencySymbol)}</dd>
              </div>
              <div>
                <dt>With 1 house</dt>
                <dd>{formatMoney(space.rents.with1House, currencySymbol)}</dd>
              </div>
              <div>
                <dt>With 2 houses</dt>
                <dd>{formatMoney(space.rents.with2Houses, currencySymbol)}</dd>
              </div>
              <div>
                <dt>With 3 houses</dt>
                <dd>{formatMoney(space.rents.with3Houses, currencySymbol)}</dd>
              </div>
              <div>
                <dt>With 4 houses</dt>
                <dd>{formatMoney(space.rents.with4Houses, currencySymbol)}</dd>
              </div>
              <div>
                <dt>With hotel</dt>
                <dd>{formatMoney(space.rents.withHotel, currencySymbol)}</dd>
              </div>
            </dl>
            <div className="deed-footer">
              Houses: {formatMoney(space.houseCost, currencySymbol)} each
              <span>Hotels: {formatMoney(space.hotelCost, currencySymbol)} each</span>
            </div>
          </>
        ) : null}

        {space.kind === SpaceKind.Railway ? (
          <>
            <div className="deed-primary-stats">
              <span>
                Site value<strong>{formatMoney(space.price, currencySymbol)}</strong>
              </span>
              <span>
                Mortgage value
                <strong>{formatMoney(space.mortgageValue, currencySymbol)}</strong>
              </span>
            </div>
            <p className="deed-rent-title">Rent by stations owned</p>
            <dl className="rent-schedule" data-testid={TEST_IDS.rentSchedule}>
              {space.rentByCount.map((rent, index) => (
                <div key={rent}>
                  <dt>
                    {index + 1} railway{index === 0 ? '' : 's'}
                  </dt>
                  <dd>{formatMoney(rent, currencySymbol)}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        {space.kind === SpaceKind.Utility ? (
          <>
            <div className="deed-primary-stats">
              <span>
                Site value<strong>{formatMoney(space.price, currencySymbol)}</strong>
              </span>
              <span>
                Mortgage value
                <strong>{formatMoney(space.mortgageValue, currencySymbol)}</strong>
              </span>
            </div>
            <p className="detail-copy">Rent is based on the dice roll.</p>
            <dl className="rent-schedule" data-testid={TEST_IDS.rentSchedule}>
              <div>
                <dt>One utility owned</dt>
                <dd>{space.rentMultiplierOne}x dice</dd>
              </div>
              <div>
                <dt>Both utilities owned</dt>
                <dd>{space.rentMultiplierBoth}x dice</dd>
              </div>
            </dl>
          </>
        ) : null}

        {space.kind === SpaceKind.CommunityChest || space.kind === SpaceKind.Chance ? (
          <p className="detail-copy">
            Land here to draw the top card, follow its instruction immediately, then
            return it to the bottom of its deck. Get Out of Jail Free cards are kept until
            used or traded.
          </p>
        ) : null}

        {space.kind === SpaceKind.Tax ? (
          <p className="detail-copy">
            Pay the Bank {formatMoney(space.amount, currencySymbol)}.
          </p>
        ) : null}
        {space.kind === SpaceKind.Go ? (
          <p className="detail-copy">
            Collect {formatMoney(GO_SALARY_DISPLAY_AMOUNT, currencySymbol)} when you land
            on or pass GO.
          </p>
        ) : null}
        {space.kind === SpaceKind.FreeParking ? (
          <p className="detail-copy">Free Parking has no effect in this ruleset.</p>
        ) : null}
        {space.kind === SpaceKind.Jail ? (
          <p className="detail-copy">
            Just visiting is safe. Players sent here must use a jail exit option on their
            turn.
          </p>
        ) : null}
        {space.kind === SpaceKind.GoToJail ? (
          <p className="detail-copy">
            Move directly to Jail. Do not collect salary for passing GO.
          </p>
        ) : null}
      </section>
    </div>
  );
}
