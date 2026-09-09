import { Link } from 'react-router-dom';
import { defaultTheme } from '../../domain/themes/themes.registry';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { AppShell } from './AppShell';

/**
 * A hash that matches no route.
 *
 * There was no catch-all, so an unmatched path rendered a **blank page** - and
 * under HashRouter that is easy to reach by accident, because a bare
 * `<a href="#faq">` is a route rather than an anchor and navigates to `/faq`.
 * A mistyped link should look like the app and offer a way on.
 */
export function NotFoundPage() {
  return (
    <AppShell editionId={defaultTheme.id}>
      <div className="page">
        <section className="panel" data-testid={TEST_IDS.notFoundPanel}>
          <p className="eyebrow">Nothing here</p>
          <h1>That page does not exist</h1>
          <p className="masthead-lede">
            The link may be out of date, or mistyped. Nothing has happened to your saved
            games.
          </p>
          <Link className="primary-button" to="/">
            Back to the start
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
