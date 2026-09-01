import type { PropertyActionDescriptor } from '../../domain/rules/playerActions.utils';
import type { GameCommandType } from '../../domain/types/game.enums';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { useEscapeKey } from '../../shared/hooks/useEscapeKey';
import type { SpaceOwnerMark } from './board/board.interfaces';
import { SpaceCard } from './deed/SpaceCard';
import type { SitePanelViewModel } from './overlays/overlays.interfaces';

interface SpaceDetailCardProps {
  currencySymbol: string;
  onClose: () => void;
  /** Fires with the picked space, which is what every property command needs. */
  onPropertyAction: (command: GameCommandType, spaceId: string) => void;
  onProposeTrade: (spaceId: string) => void;
  panel: SitePanelViewModel;
}

const HEADING_ID = 'space-detail-title';

/**
 * A space, in the context of who owns it.
 *
 * Three states, because the useful answer differs: an unowned site is just its
 * deed; someone else's site is a trade target; your own site is a set of things
 * you can do to it. This panel is also the property picker the action rail
 * lacked - the commands all need a spaceId, and this is where one exists.
 */
export function SpaceDetailCard({
  currencySymbol,
  onClose,
  onProposeTrade,
  onPropertyAction,
  panel,
}: SpaceDetailCardProps) {
  const { isOwnedByOpponent, ownerMark, ownership, siteActions, space } = panel;
  useEscapeKey(Boolean(space), onClose);

  if (!space) {
    return null;
  }

  const isOwnedByViewer = siteActions.length > 0;

  return (
    <div
      className="space-detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby={HEADING_ID}
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

        <SpaceCard
          currencySymbol={currencySymbol}
          headingId={HEADING_ID}
          ownership={ownership}
          space={space}
        />

        {/* Beside the deed, not inside it. SpaceCard's `actions` slot cannot be
            used here: a deed is a fixed height with overflow hidden, so anything
            appended inside is clipped. The buy decision keeps its buttons out of
            the card for the same reason. */}
        <SiteActions
          isOwnedByOpponent={isOwnedByOpponent}
          isOwnedByViewer={isOwnedByViewer}
          onProposeTrade={() => onProposeTrade(space.id)}
          onPropertyAction={(command) => onPropertyAction(command, space.id)}
          ownerMark={ownerMark}
          siteActions={siteActions}
        />
      </section>
    </div>
  );
}

interface SiteActionsProps {
  isOwnedByOpponent: boolean;
  isOwnedByViewer: boolean;
  onProposeTrade: () => void;
  onPropertyAction: (command: GameCommandType) => void;
  ownerMark?: SpaceOwnerMark;
  siteActions: PropertyActionDescriptor[];
}

/** Nothing at all for an unowned site: its deed already says everything. */
function SiteActions({
  isOwnedByOpponent,
  isOwnedByViewer,
  onProposeTrade,
  onPropertyAction,
  ownerMark,
  siteActions,
}: SiteActionsProps) {
  if (!isOwnedByViewer && !isOwnedByOpponent) {
    return null;
  }

  return (
    <div className="site-actions" data-testid={TEST_IDS.siteActions}>
      {ownerMark ? (
        <p className="site-owner" data-testid={TEST_IDS.siteOwner}>
          {/* The token colour is theme data, so it is an inline style here the
              same way it is on the board and the player card. */}
          <span className="site-owner-dot" style={{ backgroundColor: ownerMark.color }} />
          {isOwnedByViewer ? 'You own this site' : `Owned by ${ownerMark.ownerName}`}
        </p>
      ) : null}

      <div className="site-action-buttons">
        {siteActions.map((action) => (
          <button
            className="secondary-button"
            data-testid={`${TEST_IDS.siteAction}-${action.action}`}
            disabled={!action.isEnabled}
            key={action.action}
            onClick={() => onPropertyAction(action.command)}
            title={action.disabledReason}
            type="button"
          >
            {action.label}
          </button>
        ))}

        {isOwnedByOpponent ? (
          <button
            className="secondary-button"
            data-testid={TEST_IDS.proposeTradeButton}
            onClick={onProposeTrade}
            type="button"
          >
            Offer a deal
          </button>
        ) : null}
      </div>
    </div>
  );
}
