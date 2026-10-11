# Judgement

Scorekeeper for Judgement, the card game where you call your hands. Live at **https://judgment.okaybro.dev**.

Track each round's calls and hands made at the card table. No accounts, no backend:
everything stays in your browser, and any game can be downloaded as a JSON log and loaded back later.

## Features

- Round-by-round calls and hands made, with the dealer's forbidden call shown as you type
- Scoresheet with edit-any-round, running-score chart, tie-aware standings
- Auto-saves to `localStorage` on every keystroke; resume after a refresh or closed tab
- Stats across finished games (wins, exact-call rate, over/under-bidding, records)
- Rules page, installable PWA that works offline, keeps the screen awake during a game

## Development

Requires Node 22.17+ (see `.nvmrc`).

```sh
npm install
npm run dev      # http://localhost:5173
npm run check    # svelte-check
npm run build    # static site in build/
```

SvelteKit 3 with `adapter-static`; every route is prerendered. Pushing to `main` deploys to
GitHub Pages via `.github/workflows/deploy.yml`.

- `src/lib/game.ts`: rules, scoring, persistence (no UI)
- `src/lib/stats.ts`: cross-game stats
- `src/routes/`: play (`/`), rules (`/rules`), stats (`/stats`)
- `src/service-worker/`: offline precache
