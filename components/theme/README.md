# Site themes

The theme kit itself comes from the soleone shadcn registry
([Soleone/shadcn-components](https://github.com/Soleone/shadcn-components)) and is installed under
`components/soleone/`:

- `theme`: palette parser, built-in palettes, the head builder, `ThemeProvider` / `useTheme` (D flips dark
  and light), `revealTheme`, and `theme.css` mapping the palette slots onto the shadcn tokens.
- `theme-picker`: `ThemePicker`, the palette button and the 3D card ring it opens (T opens it from anywhere).
- `material`: the grain, glare and rim light, and the shadow and type tokens (`material.css`).

Update them with `pnpm dlx shadcn add @soleone/theme-picker --overwrite`. Change them in the registry, not here.

This folder holds only what is particular to this site:

- `config.ts`: the default theme, storage key, and where D lands.
- `themes.ts`: the site's own themes on top of the built-in palettes: Game Boy (hidden; the Konami code
  unlocks it) and showcase (the original design, hand-written in `showcase.css`).
- `head.ts`: server only. Builds the per-theme CSS and pre-paint script the root layout inlines.

`app/globals.css` imports `showcase.css`, then the kit's `theme.css` and `material.css`.

Components should only use the tokens (`bg-background`, `text-primary`, `var(--tint-1)`...), never fixed
colors or `dark:` variants for theme colors, so every theme works without knowing about them.
