import type { CssTheme, PaletteTheme } from "@/components/soleone/theme/head";

// The site's own themes, on top of the registry's built-in palettes.

export const GAME_BOY_THEME: PaletteTheme = {
  // The four greens of the BGB emulator's Game Boy palette: the page is the screen, cards are the pale
  // text boxes. Hues use only the two dark shades and their midpoint, since anything in the page's own
  // green would vanish on it; borders and hovers are midpoints between neighbouring shades.
  // Hidden from the picker; the Konami code switches to it.
  name: "game-boy",
  label: "Game Boy",
  hidden: true,
  toml: `mode = "light"

accent = "#346856"
selection = "#b4dca0"
muted = "#5e9463"

background = "#e0f8d0"
dark_background = "#88c070"
lighter_background = "#b4dca0"

foreground = "#081820"
dark_foreground = "#346856"
bright_foreground = "#081820"

red = "#081820"
yellow = "#1e403b"
orange = "#346856"
green = "#346856"
cyan = "#1e403b"
blue = "#081820"
magenta = "#346856"
brown = "#1e403b"`,
};

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
