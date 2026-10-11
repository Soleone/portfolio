/**
 * The per-site choices. Everything else in this folder is the same from one project to the next.
 */

/** The theme a first visit gets, and the one the server renders. */
export const DEFAULT_THEME = "gilt";

/** Where the visitor's choice is remembered in localStorage. */
export const THEME_STORAGE_KEY = "portfolio.theme";

/** Where D lands on a side (dark or light) the visitor has not picked a theme on yet. */
export const HOTKEY_FALLBACKS = { dark: "gilt", light: "flexoki-light" };
