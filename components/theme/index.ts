// The client side of the theme kit. Server code (the root layout) imports ./registry instead, so the
// palettes never ship to the browser.
export { ThemePicker } from "./picker"
export { ThemePreviewCard } from "./preview-card"
export { ThemeProvider, useTheme, isInteractiveTarget } from "./provider"
export type { ThemeMode, ThemeOption } from "./palette"
