/**
 * Server-side theme registry. Resolves every palette once and renders what the root layout
 * inlines: one CSS block per theme (so switching never waits on the network) and a tiny script
 * that restores the stored choice before first paint. Import this from server code only; the
 * client gets plain `ThemeOption`s as props, so the TOML never ships to the browser.
 */
import { BUILTIN_THEMES, SHOWCASE_THEME } from "./builtin";
import { parseThemeFile, type ThemeOption, type ThemePalette } from "./palette";

export const DEFAULT_THEME = "gilt";
export const THEME_STORAGE_KEY = "portfolio.theme";

/** Palette slots exposed to CSS as `--om-*`, the ones globals.css maps onto shadcn tokens. */
const PALETTE_SLOTS = [
  "accent",
  "on_accent",
  "on_red",
  "background",
  "dark_background",
  "darker_background",
  "lighter_background",
  "selection",
  "muted",
  "foreground",
  "dark_foreground",
  "light_foreground",
  "bright_foreground",
  "muted_foreground",
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "magenta",
  "brown",
];

type ThemeRecord = ThemeOption & { palette: ThemePalette };

// The default leads, the rest follow alphabetically; the picker lists them in this order.
const records: ThemeRecord[] = [
  ...BUILTIN_THEMES.map(({ name, label, toml }) => {
    const { mode, palette } = parseThemeFile(toml);
    return { name, label, mode, palette, accent: palette.accent, canvas: palette.dark_background };
  }),
  SHOWCASE_THEME,
].sort((a, b) => Number(b.name === DEFAULT_THEME) - Number(a.name === DEFAULT_THEME) || a.label.localeCompare(b.label));

if (!records.some((theme) => theme.name === DEFAULT_THEME)) throw new Error(`unknown default theme "${DEFAULT_THEME}"`);

export const themeOptions: ThemeOption[] = records.map(({ name, label, mode, accent, canvas }) => ({
  name,
  label,
  mode,
  accent,
  canvas,
}));

const declarations = (palette: ThemePalette): string =>
  PALETTE_SLOTS.filter((slot) => palette[slot] !== undefined)
    .map((slot) => `--om-${slot.replaceAll("_", "-")}:${palette[slot]}`)
    .join(";");

/** A theme with no palette (showcase) styles itself from hand-written CSS instead. */
export const themeStyles = records
  .filter(({ palette }) => Object.keys(palette).length > 0)
  .map(({ name, palette }) => `:root[data-theme="${name}"]{${declarations(palette)}}`)
  .join("\n");

export const defaultThemeIsDark = records.find((theme) => theme.name === DEFAULT_THEME)?.mode === "dark";

const modes = Object.fromEntries(records.map(({ name, mode }) => [name, mode]));

/** Runs in <head> before paint. Mirrors `apply` in components/theme-provider.tsx. */
export const themeScript = `(function(){try{var m=${JSON.stringify(modes)},r=document.documentElement,t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(!Object.hasOwn(m,t))t=${JSON.stringify(DEFAULT_THEME)};r.dataset.theme=t;r.classList.toggle("dark",m[t]==="dark"||(m[t]==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch(e){}})()`;
