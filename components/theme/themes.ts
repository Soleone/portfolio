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
 * Copper Night, an Omarchy 4 theme by hembramnishant50-glitch.
 * Source: https://github.com/hembramnishant50-glitch/omarchy-coppernight-theme at commit
 * b1d0f8cbcc71c3ccd97057fddbb52d979efa7add.
 *
 * Upstream's README claims MIT, but the referenced LICENSE file is absent at that revision, so no
 * license notice is invented here.
 *
 * The upstream colors.toml is embedded unchanged. Its named slots map directly to this site's
 * palette slots, including `mode`, `selection`, `orange`, and `brown`, so no compatibility overrides
 * are appended. The parser derives only the contrast-aware slots that are not present upstream
 * (`on_accent`, `on_red`, and `muted_foreground`). Terminal/UI extras that the site does not expose
 * (`cursor`, `bright_*`, and `hyprland_*`) are parsed but ignored by the generated CSS.
 */
export const COPPERNIGHT_THEME: PaletteTheme = {
  name: "coppernight",
  label: "Copper Night",
  toml: `mode = "dark"

accent = "#fab387"
cursor = "#ed8796"
selection = "#313244"
muted = "#5b6078"

background = "#11111b"
dark_background = "#0b0b12"
darker_background = "#060609"
lighter_background = "#1e1e2e"

foreground = "#cad3f5"
dark_foreground = "#6e738d"
light_foreground = "#b8c0e0"
bright_foreground = "#cad3f5"

red = "#ed8796"
yellow = "#eed49f"
orange = "#fab387"
green = "#a6da95"
cyan = "#8bd5ca"
blue = "#8aadf4"
magenta = "#c6a0f6"
brown = "#7b5b55"

bright_red = "#ed8796"
bright_yellow = "#fab387"
bright_green = "#a6da95"
bright_cyan = "#8bd5ca"
bright_blue = "#8aadf4"
bright_magenta = "#c6a0f6"

hyprland_active_border = "#fab387"
hyprland_inactive_border = "#c6a0f6"`,
};

/**
 * Oligarchy, a propaganda-poster light theme for Omarchy by AlexanderBuzz.
 * Source: https://github.com/AlexanderBuzz/omarchy-oligarchy-theme at commit
 * 6746fb318f5682cc1896957cb941ee2125dbff75, MIT licensed (see oligarchy.LICENSE).
 *
 * This is an adaptation, not verbatim: upstream's colors.toml is kept unchanged at the top, and a
 * compatibility block is appended after it. Upstream only declares ANSI `colorN` keys, which this
 * site's palette parser ignores, so the block maps them onto the named hue slots the site uses:
 * red=color1, green=color2, yellow=color3, blue=color4, magenta=color5, cyan=color6, orange=color11,
 * brown=color8, plus `mode = "light"` (otherwise inferred from the background).
 *
 * Upstream's selection (cream text on red) is deliberately not mapped to `selection`: the site uses
 * that slot as a quiet surface under dark `bright_foreground` text, which red would make unreadable.
 * `selection` stays derived from background and foreground; `selection_*` are ignored.
 */
export const OLIGARCHY_THEME: PaletteTheme = {
  name: "oligarchy",
  label: "Oligarchy",
  toml: `# Oligarchy — a propaganda-poster LIGHT theme for Omarchy
# Palette extracted from the "Beware the Omarchy Oligarchy" poster:
# cream paper, brick red, ink black, with aged ochre/olive/slate secondaries.
# Selection mimics the poster's red banners (cream text on red).
#
# ANSI "white" (7 and 15) is inked rather than pale: on cream paper a literal
# white is invisible. Omarchy's own light themes invert it the same way, and
# newer Omarchy force-sets color7 to \`foreground\` regardless.

accent = "#c0271c"
cursor = "#c0271c"
foreground = "#1a160f"
background = "#eae0cb"
selection_foreground = "#eae0cb"
selection_background = "#c0271c"

color0  = "#1a160f"
color1  = "#b0281e"
color2  = "#5e6b33"
color3  = "#a9791f"
color4  = "#3e5a78"
color5  = "#7e3b4e"
color6  = "#2e6e6a"
color7  = "#3b342a"
color8  = "#6b6152"
color9  = "#c0271c"
color10 = "#77863f"
color11 = "#c99a3a"
color12 = "#4e7095"
color13 = "#9a5266"
color14 = "#3e8a84"
color15 = "#1a160f"

# --- Site compatibility mapping (not part of upstream) ---
# Maps upstream's ANSI colors onto the named slots this site reads. \`selection\` is intentionally
# left out so it stays derived (see the comment above OLIGARCHY_THEME).
mode = "light"

red = "#b0281e"
green = "#5e6b33"
yellow = "#a9791f"
blue = "#3e5a78"
magenta = "#7e3b4e"
cyan = "#2e6e6a"
orange = "#c99a3a"
brown = "#6b6152"`,
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
