import { createThemeHead } from "@/components/soleone/theme/head";
import { BUILTIN_THEMES } from "@/components/soleone/theme/palettes";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "./config";
import { COPPERNIGHT_THEME, GAME_BOY_THEME, OLIGARCHY_THEME, SHOWCASE_THEME } from "./themes";

// Server only: what the root layout inlines. The client gets `themeOptions` as props, so the
// palettes never ship to the browser.
export const { themeOptions, themeStyles, themeScript, defaultThemeIsDark } = createThemeHead({
  themes: [...BUILTIN_THEMES, COPPERNIGHT_THEME, GAME_BOY_THEME, OLIGARCHY_THEME, SHOWCASE_THEME],
  defaultTheme: DEFAULT_THEME,
  storageKey: THEME_STORAGE_KEY,
});
