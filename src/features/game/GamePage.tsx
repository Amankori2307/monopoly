import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { availableThemes } from '../../domain/themes/indiaEditionTheme';
import type { BoardSpace } from '../../domain/types/game';
import { loadGameById, runGameCommand } from './gameSlice';
import { setAuctionBidInput } from './uiSlice';
import { DiceDock } from '../../components/game/DiceDock';
import { SpaceDetailCard } from '../../components/game/SpaceDetailCard';
import goIcon from '../../assets/images/board-corners/go.svg';
import freeParkingIcon from '../../assets/images/board-corners/free-parking.svg';
import justVisitingIcon from '../../assets/images/board-corners/just-visiting.svg';
import goToJailIcon from '../../assets/images/board-corners/go-to-jail.svg';
import railwayIcon from '../../assets/images/board-icons/railway.svg';
import communityChestIcon from '../../assets/images/board-icons/community-chest.svg';
import chanceIcon from '../../assets/images/board-icons/chance.svg';
import waterWorksIcon from '../../assets/images/board-icons/water-works.svg';
import electricCompanyIcon from '../../assets/images/board-icons/electric-company.svg';
import taxIcon from '../../assets/images/board-icons/tax.svg';
import superTaxIcon from '../../assets/images/board-icons/super-tax.svg';

const cornerIcons: Partial<Record<BoardSpace['kind'], string>> = {
  go: goIcon,
  'free-parking': freeParkingIcon,
  jail: justVisitingIcon,
  'go-to-jail': goToJailIcon,
};

const spaceIcons: Partial<Record<BoardSpace['kind'], string>> = {
  railway: railwayIcon,
  'community-chest': communityChestIcon,
  chance: chanceIcon,
  tax: taxIcon,
};

const boardToGridPosition = (index: number) => {
  if (index <= 10) {
    return { row: 11, column: 11 - index };
  }
  if (index <= 20) {
    return { row: 11 - (index - 10), column: 1 };
  }
  if (index <= 30) {
    return { row: 1, column: index - 20 + 1 };
  }
  return { row: index - 30 + 1, column: 11 };
};

const getSpaceColor = (space: BoardSpace): string => {
  if (space.kind !== 'street') {
    return '#e5dcae';
  }

  return (
    {
      brown: '#8d5a2b',
      'light-blue': '#8fd3ff',
      pink: '#ef6fb0',
      orange: '#f08c2e',
      red: '#d13232',
      yellow: '#e7c947',
      green: '#2a9d5b',
      'dark-blue': '#3150b6',
    }[space.colorGroup] ?? '#e5dcae'
  );
};

export function GamePage() {
  const { gameId = '' } = useParams();
  const dispatch = useAppDispatch();
  const activeGame = useAppSelector((state) => state.game.activeGame);
  const loadError = useAppSelector((state) => state.game.loadError);
  const uiHints = useAppSelector((state) => state.game.uiHints);
  const auctionBidInput = useAppSelector((state) => state.ui.auctionBidInput);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(loadGameById(gameId));
  }, [dispatch, gameId]);

  const theme = useMemo(
    () => availableThemes.find((candidate) => candidate.id === activeGame?.themeId),
    [activeGame?.themeId]
  );

  if (!activeGame) {
    return (
      <div className="app-shell">
        <div className="page panel">
          <h1>Saved game unavailable</h1>
          <p>{loadError ?? 'This game could not be loaded.'}</p>
          <Link className="primary-button" to="/">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const activePlayerId = activeGame.playerOrder[activeGame.activePlayerIndex];
  const activePlayer = activeGame.players[activePlayerId];
  const currentSpace = activeGame.board[activePlayer.position];
  const selectedSpace = activeGame.board.find((space) => space.id === selectedSpaceId) ?? null;
  const ownedProperties = activeGame.board.filter((space) => {
    const ownership = activeGame.ownership[space.id];
    return ownership?.ownerPlayerId === activePlayerId;
  });
  const isJailRoll = activeGame.pendingDecision.type === 'jail-choice';
  const canRollDice = activeGame.turn.phase === 'await_roll' || isJailRoll;

  const renderDecisionPanel = () => {
    if (activeGame.pendingDecision.type === 'landed-unowned-property') {
      const decision = activeGame.pendingDecision;
      const space = activeGame.board.find(
        (boardSpace) => boardSpace.id === decision.spaceId
      );
      if (
        !space ||
        !(space.kind === 'street' || space.kind === 'railway' || space.kind === 'utility')
      ) {
        return null;
      }

      return (
        <section className="decision-card">
          <h2>Buy or auction</h2>
          <p>
            {activePlayer.name} landed on <strong>{space.name}</strong> for{' '}
            <strong>
              {theme?.currencySymbol ?? 'M'}
              {space.price}
            </strong>
            .
          </p>
          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={() => dispatch(runGameCommand({ type: 'buyLandedAsset' }))}
            >
              Buy
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => dispatch(runGameCommand({ type: 'declineLandedAsset' }))}
            >
              Decline and auction
            </button>
          </div>
        </section>
      );
    }

    if (activeGame.pendingDecision.type === 'auction-bid' && activeGame.auctionState) {
      const auction = activeGame.auctionState;
      const activeBidderId = auction.activeBidderOrder[auction.activeBidderIndex];
      const minimumBid = Math.max(auction.startPrice, auction.highestBid + auction.minIncrement);
      const activeBidder = activeGame.players[activeBidderId];
      const auctionSpace = activeGame.board.find((space) => space.id === auction.spaceId);

      return (
        <section className="decision-card">
          <h2>Auction</h2>
          <p>
            Bidding for <strong>{auctionSpace?.name}</strong>. Current high bid:{' '}
            <strong>
              {theme?.currencySymbol ?? 'M'}
              {auction.highestBid}
            </strong>
            .
          </p>
          <p>
            Active bidder: <strong>{activeBidder.name}</strong>
          </p>
          <label>
            Bid amount
            <input
              className="text-input"
              type="number"
              min={minimumBid}
              value={auctionBidInput}
              onChange={(event) =>
                dispatch(setAuctionBidInput(Number(event.target.value)))
              }
            />
          </label>
          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                dispatch(
                  runGameCommand({
                    type: 'submitAuctionBid',
                    amount: auctionBidInput,
                  })
                )
              }
            >
              Submit bid
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => dispatch(runGameCommand({ type: 'passAuction' }))}
            >
              Pass
            </button>
          </div>
        </section>
      );
    }

    if (activeGame.pendingDecision.type === 'jail-choice') {
      return (
        <section className="decision-card">
          <h2>Jail choice</h2>
          <p>{activePlayer.name} is in Jail and must choose how to leave.</p>
          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={() => dispatch(runGameCommand({ type: 'payJailFine' }))}
            >
              Pay M50
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={activePlayer.jailFreeCards < 1}
              onClick={() => dispatch(runGameCommand({ type: 'useJailFreeCard' }))}
            >
              Use jail card
            </button>
          </div>
        </section>
      );
    }

    if (activeGame.pendingDecision.type === 'asset-liquidation') {
      return (
        <section className="decision-card">
          <h2>Asset liquidation required</h2>
          <p>
            {activePlayer.name} owes {theme?.currencySymbol ?? 'M'}
            {activeGame.pendingDecision.amountDue}. Mortgage, building sales, and
            bankruptcy resolution are scaffolded next.
          </p>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="app-shell">
      <div className="page">
        <div className="game-layout">
          <section className="board-card panel">
            <div className="board-grid" data-testid="board-grid">
              <div className="board-center">
                <div className="deck-marker community-deck" aria-hidden="true">
                  <span>Community</span>
                  <strong>Chest</strong>
                </div>
                <div className="deck-marker chance-deck" aria-hidden="true">
                  <strong>?</strong>
                  <span>Chance</span>
                </div>
                <div className="board-logo-ribbon" aria-label="Monopoly India Edition">
                  <span>Monopoly</span>
                  <small>India Edition</small>
                </div>
              </div>
              {activeGame.board.map((space) => {
                const position = boardToGridPosition(space.index);
                const ownership = activeGame.ownership[space.id];
                const playersOnSpace = activeGame.playerOrder
                  .map((playerId) => activeGame.players[playerId])
                  .filter((player) => player.position === space.index);
                const owner = ownership?.ownerPlayerId
                  ? activeGame.players[ownership.ownerPlayerId]
                  : null;
                const cornerIcon = cornerIcons[space.kind];
                const spaceIcon = space.kind === 'utility' && space.name === 'Electric Company'
                  ? electricCompanyIcon
                  : space.kind === 'tax' && space.name === 'Super Tax'
                    ? superTaxIcon
                  : space.kind === 'utility'
                    ? waterWorksIcon
                    : spaceIcons[space.kind];

                return (
                  <button
                    aria-label={`View details for ${space.name}`}
                    className={`board-space space-${space.kind} ${
                      playersOnSpace.length > 0 ? 'active-space' : ''
                    } ${[0, 10, 20, 30].includes(space.index) ? 'corner-space' : ''}`}
                    key={space.id}
                    onClick={() => setSelectedSpaceId(space.id)}
                    style={{
                      gridRow: position.row,
                      gridColumn: position.column,
                    }}
                  >
                    <div
                      className="space-color"
                      style={{ background: getSpaceColor(space) }}
                    />
                    {cornerIcon ? (
                      <div className="corner-title">
                        <img alt="" aria-hidden="true" src={cornerIcon} />
                        <strong className="space-name">{space.name}</strong>
                      </div>
                    ) : (
                      <div className="space-label">
                        {spaceIcon ? <img alt="" aria-hidden="true" className="space-icon" src={spaceIcon} /> : null}
                        <strong className="space-name">{space.name}</strong>
                      </div>
                    )}
                    <div>
                      {owner ? <div className="space-owner">{owner.name.charAt(0)}</div> : null}
                      <div className="space-players">
                        {playersOnSpace.map((player) => {
                          const token = theme?.tokenCatalog.find(
                            (candidate) => candidate.id === player.tokenId
                          );
                          return (
                            <span className="token-chip" key={player.id} title={player.name}>
                              {token?.emoji ?? player.name.charAt(0)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="game-side">
            <section className="turn-panel panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Turn {activeGame.turnNumber}</p>
                  <h2>{activePlayer.name}'s move</h2>
                </div>
                <span className="turn-token">
                  {theme?.tokenCatalog.find((token) => token.id === activePlayer.tokenId)
                    ?.emoji ?? activePlayer.name.charAt(0)}
                </span>
              </div>
              <p className="turn-location">At {currentSpace.name}</p>
              <div className="button-row">
                {(activeGame.turn.phase === 'turn_complete' ||
                  activeGame.turn.phase === 'await_extra_roll_or_end') && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => dispatch(runGameCommand({ type: 'endTurn' }))}
                  >
                    {activeGame.turn.canRollAgain ? 'Take extra roll' : 'End turn'}
                  </button>
                )}
                <Link className="secondary-button" to="/">
                  Home
                </Link>
                <Link className="secondary-button" to="/rules">
                  Rules
                </Link>
              </div>
            </section>

            {renderDecisionPanel()}

            {uiHints.length > 0 ? (
              <section className="decision-card">
                <h2>Upcoming phases</h2>
                <div className="event-list">
                  {uiHints.map((hint) => (
                    <div className="event-item" key={hint}>
                      {hint}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="panel player-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Table</p>
                  <h2>Players</h2>
                </div>
                <span className="counter-badge">{activeGame.players ? activeGame.playerOrder.length : 0}</span>
              </div>
              <div className="player-list">
                {activeGame.playerOrder.map((playerId) => {
                  const player = activeGame.players[playerId];
                  const token = theme?.tokenCatalog.find(
                    (candidate) => candidate.id === player.tokenId
                  );
                  const propertyCount = Object.values(activeGame.ownership).filter(
                    (ownership) => ownership.ownerPlayerId === playerId
                  ).length;

                  return (
                    <article
                      className={`player-card ${
                        playerId === activePlayerId ? 'is-active' : ''
                      }`}
                      key={playerId}
                    >
                      <strong>
                        {token?.emoji} {player.name}
                      </strong>
                      <div className="player-metrics">
                        <span>Cash</span>
                        <strong>
                          {theme?.currencySymbol ?? 'M'}
                          {player.cash}
                        </strong>
                        <span>Properties</span>
                        <strong>{propertyCount}</strong>
                        <span>Position</span>
                        <strong>{player.position}</strong>
                        <span>Jail</span>
                        <strong>
                          {player.inJail ? `Yes (${player.jailTurnsServed})` : 'No'}
                        </strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="panel holdings-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Portfolio</p>
                  <h2>{activePlayer.name}'s holdings</h2>
                </div>
                <span className="counter-badge">{ownedProperties.length}</span>
              </div>
              {ownedProperties.length === 0 ? (
                <div className="empty-state">No owned assets yet.</div>
              ) : (
                <div className="space-list">
                  {ownedProperties.map((space) => {
                    const ownership = activeGame.ownership[space.id];
                    return (
                      <article className="space-card" key={space.id}>
                        <strong>{space.name}</strong>
                        <div>Build level: {ownership?.buildLevel ?? 0}</div>
                        <div>Mortgaged: {ownership?.mortgaged ? 'Yes' : 'No'}</div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Game record</p>
                  <h2>Activity</h2>
                </div>
              </div>
              <div className="event-list">
                {activeGame.history.map((event) => (
                  <div className="event-item" key={event.id}>
                    <strong>Turn {event.turnNumber}</strong>
                    <div>{event.message}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
        <DiceDock
          canRoll={canRollDice}
          lastRoll={activeGame.turn.lastRoll}
          onRoll={() =>
            dispatch(
              runGameCommand({
                type: isJailRoll ? 'attemptJailRoll' : 'rollTurnDice',
              })
            )
          }
          rollLabel={isJailRoll ? 'Roll for doubles' : 'Roll dice'}
        />
        <SpaceDetailCard
          currencySymbol={theme?.currencySymbol ?? 'M'}
          onClose={() => setSelectedSpaceId(null)}
          space={selectedSpace}
        />
      </div>
    </div>
  );
}
