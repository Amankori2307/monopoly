/**
 * The header's navigation, in order.
 *
 * One list so the header, its tests and any future breadcrumb cannot disagree
 * about what the app's top-level places are — the same reasoning as
 * `RULES_SECTIONS`, which is the single list behind the booklet's nav, its
 * sections and the matching headings in the markdown.
 *
 * `to` is a router path, never a bare `#fragment`: under HashRouter a bare
 * anchor is a route, so `href="#rules"` navigates to `/rules`-the-nonexistent
 * and blanks the page. See CLAUDE.md section 8.
 */
export const NAV_ITEMS = [
  { to: '/', label: 'Play' },
  { to: '/rules', label: 'Rules' },
] as const;
