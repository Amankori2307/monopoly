import { Link } from 'react-router-dom';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface NoServerPanelProps {
  title: string;
}

/**
 * What an offline build says when somebody types an online route.
 *
 * The chooser hides the online cards entirely - never render a control that
 * cannot work - but a URL can still be typed or bookmarked, and a blank panel
 * would read as a broken app rather than as a build without a server.
 */
export function NoServerPanel({ title }: NoServerPanelProps) {
  return (
    <div className="page">
      <section className="panel" data-testid={TEST_IDS.noServerPanel}>
        <h1>{title}</h1>
        <p className="masthead-lede">
          This copy was built without a game server, so there is nothing to host a table
          on. Everything else works: a game on this device plays exactly the same, and
          saves itself as you go.
        </p>
        <Link className="primary-button" to="/new">
          Play on this device
        </Link>
      </section>
    </div>
  );
}
