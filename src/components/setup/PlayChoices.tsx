import { Link } from 'react-router-dom';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface PlayChoicesProps {
  /** Whether this build has a game server to reach at all. */
  isOnline: boolean;
}

/**
 * The three ways in.
 *
 * The online two are absent rather than disabled in a build with no server
 * configured, which is the rule the whole multiplayer surface follows: never
 * render a control that cannot work. See onlineConfig.
 */
export function PlayChoices({ isOnline }: PlayChoicesProps) {
  return (
    <div className="play-choices">
      <Link className="play-choice" data-testid={TEST_IDS.chooserPlayLocal} to="/new">
        <strong className="play-choice-title">On this device</strong>
        <span className="play-choice-copy">
          Two to eight players around one screen, passing it between turns.
        </span>
      </Link>

      {isOnline ? (
        <>
          <Link
            className="play-choice"
            data-testid={TEST_IDS.chooserHostOnline}
            to="/host"
          >
            <strong className="play-choice-title">Host online</strong>
            <span className="play-choice-copy">
              Open a table and share the code. Everybody plays from their own device.
            </span>
          </Link>

          <Link
            className="play-choice"
            data-testid={TEST_IDS.chooserJoinOnline}
            to="/join"
          >
            <strong className="play-choice-title">Join a game</strong>
            <span className="play-choice-copy">
              Somebody sent you a six-character code? Type it in here.
            </span>
          </Link>
        </>
      ) : null}
    </div>
  );
}
