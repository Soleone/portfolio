# portfolio

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_K6JwuDQKxZS5oET5AfoRwHCI4vZ2)

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

The header has a theme picker (a shadcn `Select`). Themes are palettes in the same omarchy
`colors.toml` format as the tasks app, so a palette can be pasted in from there. The default is
Gilt, and the choice is remembered in `localStorage` (`portfolio.theme`).

- `lib/themes/builtin.ts` holds the palettes. Add a theme by pasting one in.
- `lib/themes/palette.ts` parses them and derives the slots a palette leaves out.
- The root layout inlines one `:root[data-theme="..."]` block per theme plus a tiny script that applies
  the stored choice before first paint, so there is no flash.
- `app/globals.css` maps the palette slots (`--om-*`) onto the shadcn tokens. Components only use the
  tokens, so keep colors out of components (project card tints come from `--tint-1..8`).
- `showcase` is the original design (zinc and pink, follows the OS appearance), kept for comparison.
  To retire it, delete `SHOWCASE_THEME` in `lib/themes/builtin.ts`, `app/showcase-theme.css` and its
  `@import` in `globals.css`.

Press `D` to flip between dark and light.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
