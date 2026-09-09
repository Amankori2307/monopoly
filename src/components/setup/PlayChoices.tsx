import { Link } from 'react-router-dom';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

/**
 * The three ways in.
 *
 * All three, always. The online two used to be hidden unless the build had a
 * backend configured - which made the KIND of game a property of the build
 * rather than a choice the player makes, and meant the ordinary dev server
 * could not offer online play at all. There is one kind of game; where you play
 * it is picked here. A build genuinely without a server says so on the screen
 * you land on, which is better than a door that is not there.
 */
export function PlayChoices() {
  return (
    <div className="play-choices">
      <Link className="play-choice" data-testid={TEST_IDS.chooserPlayLocal} to="/new">
        <strong className="play-choice-title">On this device</strong>
        <span className="play-choice-copy">
          Two to eight players around one screen, passing it between turns.
        </span>
      </Link>
      <Link className="play-choice" data-testid={TEST_IDS.chooserHostOnline} to="/host">
        <strong className="play-choice-title">Host online</strong>
        <span className="play-choice-copy">
          Open a table and share the code. Everybody plays from their own device.
        </span>
      </Link>

      <Link className="play-choice" data-testid={TEST_IDS.chooserJoinOnline} to="/join">
        <strong className="play-choice-title">Join a game</strong>
        <span className="play-choice-copy">
          Somebody sent you a six-character code? Type it in here.
        </span>
      </Link>
    </div>
  );
}
