# portfolio

A [Next.js](https://nextjs.org) site, hosted on Vercel at [soleone.xyz](https://soleone.xyz).

## Deploying

The Vercel project `portfolio` is connected to this GitHub repo: every push to `main` deploys to
production, and other branches get preview deployments. `pnpm deploy` still ships the local working
directory straight to production through the Vercel CLI, for when that is needed.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Theming

The header has a theme picker: the palette button (or `T`) opens a ring of preview cards, each drawn
in its own theme. Drag, scroll or use the arrows to browse, type to filter, and click the front card or
press Enter to switch; the new theme spreads over the page from the card. Themes are palettes in the
same omarchy `colors.toml` format as the tasks app, so a palette can be pasted in from there. The
default is Gilt, and the choice is remembered in `localStorage` (`portfolio.theme`). Press `D` to flip
between dark and light.

Everything theme-related lives in `components/theme/`, so it can move to another project as one
folder. Its README lists the files and the setup.

- `components/theme/builtin.ts` holds the palettes. Add a theme by pasting one in.
- `components/theme/theme.css` maps the palette slots (`--om-*`) onto the shadcn tokens. Components
  only use the tokens, so keep colors out of components (project card tints come from `--tint-1..8`).
- `showcase` is the original design (zinc and pink, follows the OS appearance), kept for comparison.
  To retire it, delete `SHOWCASE_THEME` in `components/theme/builtin.ts`, `components/theme/showcase.css`
  and its `@import` in `theme.css`.
- `/lab/themes` is an unlinked playground for the picker.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
