/**
 * Kept so existing imports keep working while callers move to
 * `themes.registry`. Everything here is now built from `india.theme.ts`.
 */
export { indiaTheme as indiaEditionTheme } from './india.theme';
export { availableThemes, defaultTheme, getThemeOrDefault } from './themes.registry';
