# Theme kit

Palette themes, the provider that applies them, and the picker in the header. Everything lives in
this folder so it can be copied into another project.

## Files

- `config.ts`: the per-site choices (default theme, storage key, where D lands). Usually the only file to edit.
- `builtin.ts`: the palettes, in omarchy `colors.toml` format. Add a theme by pasting one in.
- `palette.ts`: parses a palette and derives the slots it leaves out. Pure, so it runs on the server.
- `registry.ts`: server only. Builds the CSS block per theme and the script that applies the stored
  choice before first paint.
- `theme.css`: maps the palette slots (`--om-*`) onto the shadcn tokens on any `[data-theme]` element,
  plus the rule the picker's reveal animation needs.
- `showcase.css`: a hand-written theme (this site's original design). Delete it, its `@import` in
  `theme.css` and `SHOWCASE_THEME` in `builtin.ts` if you don't need it.
- `provider.tsx`: `ThemeProvider`, `useTheme` and the D hotkey (flip dark and light).
- `picker.tsx`: `ThemePicker`, the palette button and the 3D card ring it opens (T opens it from anywhere).
- `preview-card.tsx`: a card that draws one theme in its own tokens, whatever the page is in.
- `sheen.tsx`: the glare and rim light on the cards, and the grain texture.
- `index.ts`: client exports. Server code imports `./registry` directly.

## Moving it to another project

It expects Next (App Router), React 19, Tailwind v4 with shadcn's tokens, and these packages:
`@base-ui/react`, `motion`, `lucide-react`. Outside this folder it uses shadcn's `Button` and `Kbd`
(`@/components/ui`) and `cn` (`@/lib/utils`).

1. Copy the folder and set `config.ts`.
2. In the global CSS, `@import` `theme.css` after Tailwind, and keep shadcn's `@theme inline` block and
   `@custom-variant dark (&:is(.dark *));`.
3. In the root layout, render the head and wrap the app:

```tsx
import { ThemeProvider } from "@/components/theme"
import { DEFAULT_THEME, THEME_STORAGE_KEY, defaultThemeIsDark, themeOptions, themeScript, themeStyles } from "@/components/theme/registry"

<html suppressHydrationWarning data-theme={DEFAULT_THEME} className={defaultThemeIsDark ? "dark" : undefined}>
  <head>
    <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
    <script dangerouslySetInnerHTML={{ __html: themeScript }} />
  </head>
  <body>
    <ThemeProvider themes={themeOptions} storageKey={THEME_STORAGE_KEY}>{children}</ThemeProvider>
  </body>
</html>
```

4. Put `<ThemePicker />` in the header.

Components should only use the tokens (`bg-background`, `text-primary`, `var(--tint-1)`...), never fixed
colors or `dark:` variants for theme colors, so every theme works without knowing about them.
