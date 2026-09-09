import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { PlayChoices } from '../../components/setup/PlayChoices';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { defaultTheme } from '../../domain/themes/themes.registry';
import { bootstrapRecentGames } from '../game/gameSlice';
import { savedGameBlockedReasons, savedGameModeLabels } from './savedGames.utils';
import { isOnlineEnabled } from '../multiplayer/onlineConfig.utils';
import { AppShell } from '../shell/AppShell';

/**
 * The front door: how do you want to play?
 *
 * It used to be everything at once - a masthead, a ruleset table, the whole
 * 2-to-8-player setup form, an appearance picker, a saved-games list, and a
 * "Play online" button sharing a `.button-row` with "Create game". Starting a
 * hot-seat game and hosting an online table are different intentions, and the
 * saved-games list means nothing when you are about to join somebody else's.
 *
 * So this asks the one question, and each answer gets a screen carrying only
 * what belongs to it.
 */
export function ChooserPage() {
  const dispatch = useAppDispatch();
  const recentGames = useAppSelector((state) => state.game.recentGames);
  const loadError = useAppSelector((state) => state.game.loadError);

  useEffect(() => {
    dispatch(bootstrapRecentGames());
  }, [dispatch]);

  // The index is rewritten sorted by updatedAt, so the newest is the one you
  // most likely walked away from.
  const latest = recentGames[0] ?? null;
  // An online save this device has no code for is on disk and unplayable, so
  // the front door must not offer it as a one-click resume.
  const latestBlocked = latest ? savedGameBlockedReasons([latest])[latest.id] : null;

  return (
    <AppShell editionId={defaultTheme.id}>
      <div className="page chooser-page">
        <section className="chooser-masthead">
          <p className="eyebrow">Monopoly</p>
          <h1>How are you playing?</h1>
          <p className="masthead-lede">
            Roll, buy, build, and bankrupt your friends. Every game saves itself as you
            play, so you can stop mid-turn and pick it up later.
          </p>
        </section>

        {/* Resuming is the commonest repeat visit, so it is not hidden a screen
            deep behind "On this device" - but it only exists when there is
            something to resume. */}
        {latest && !latestBlocked ? (
          <Link
            className="chooser-continue"
            data-testid={TEST_IDS.chooserContinue}
            to={`/game/${latest.id}`}
          >
            <span className="chooser-continue-label">Continue</span>
            <strong className="chooser-continue-name">{latest.name}</strong>
            <span className="chooser-continue-meta">
              {savedGameModeLabels([latest])[latest.id]} · {latest.playerCount} players ·
              turn {latest.turnNumber}
            </span>
          </Link>
        ) : null}

        {loadError ? <div className="error-text">{loadError}</div> : null}

        <PlayChoices isOnline={isOnlineEnabled()} />
      </div>
    </AppShell>
  );
}
