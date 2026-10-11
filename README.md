# Judgement (web)

Browser version of the `../Judgement` desktop scorekeeper. Svelte 5 + Vite, no backend.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

- The game in progress auto-saves to `localStorage` and can be resumed from the home screen.
- "Save game log" downloads the same JSON format the desktop app writes, and
  "Load Saved Game" accepts logs from either version.
- Game rules and scoring live in `src/lib/game.ts`.
