import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to the section named by the URL hash.
 *
 * Under HashRouter the browser's own anchor scrolling is gone: the whole route
 * lives after the `#`, so `#/rules#faq` is one opaque string to the browser
 * and it has no `id` to jump to. React Router parses the second `#` into
 * `location.hash` correctly, but nothing acts on it - so a nav link changed
 * the URL and left the page where it was.
 *
 * The effect runs on every hash change rather than on mount alone, because
 * clicking a second nav link is a hash change with no remount.
 */
export const useHashScroll = (): void => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      return;
    }

    // `hash` is '#faq'; getElementById wants 'faq'. An id that does not exist
    // is a dead nav link, which rulesSync.test.ts already rules out - so this
    // is a guard against a bad URL someone typed, not against our own links.
    const target = document.getElementById(hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);
};
