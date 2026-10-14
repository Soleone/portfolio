import type { CssTheme } from "@/components/soleone/theme/head";

// The site's own theme, on top of the registry's built-in palettes.

/**
 * The site's original design (zinc surfaces, pink primary) kept as a theme while the palette
 * themes are compared against it. It has no palette: its tokens are hand-written in
 * showcase.css and it follows the OS appearance like the site used to.
 *
 * To retire it, delete this record, showcase.css and its @import in app/globals.css.
 */
export const SHOWCASE_THEME: CssTheme = {
  name: "showcase",
  label: "Showcase",
  mode: "system",
  palette: {},
  accent: "oklch(0.525 0.223 3.958)",
  canvas: "oklch(0.985 0 0)",
};
