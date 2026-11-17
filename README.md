[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/madinzgod/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/madinzgod/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# make.fun bounties — a fast frontend for the live bounty board

A dependency-free frontend for [make.fun](https://make.fun) that renders
the whole site from its public API: the bounty board, each bounty's page,
its leaderboard, and every entrant's profile.

## What it shows

- **A persistent bounty rail.** The board stays on the left of every
  screen — board, bounty, leaderboard and profile alike — and never
  unmounts: Live/Ended tabs, category chips and search over every
  bounty, sorted by *Closing soon* by default. Each card shows the live
  pot, the entry fee, the entry count and the time left, with a red
  *closing soon* badge on bounties ending within 24 hours. On the board
  itself the selected bounty's detail fills the main pane; anywhere else
  a card click opens that bounty's page.
- **Bounty page.** A stats row (live pot, entry fee, entries, published,
  deadline, time left, status), the full rewards table paid from the live
  pot — *Place | Base | Fee share | Pays now* with a proportional bar per
  row — and a *Dates and phases* panel marking the current phase with
  *Now*.
- **Leaderboard.** Every ranked row of a bounty in a virtual list: only
  the rows in the scroll window are in the DOM, and the status line says
  so (*rows A to B of N, K in the DOM*). A filter narrows by handle,
  clicking a row opens the entrant's card with an *Open full profile*
  link, paid places carry a prize badge, and unfinalised boards are
  labelled provisional. Judged boards show win rates with their 90%
  intervals; Elo boards show the rating and the win–draw–loss record.
- **Profiles.** Stat cards (prizes won, entered, placed, won, best
  place, podiums) and the account's entries grouped by bounty, in two
  columns on wide screens. Unknown handles and slugs show a clear
  *not found* page.
- **A requests panel on every view** — *this view: X API requests,
  Y unchanged (304), Z from memory, updated N s ago* — with a Refresh
  button that revalidates.

## How it stays fast

- The entry page is one small HTML file; the views load afterwards by
  `import()`, so the first load stays tiny.
- One shared ETag cache serves every view: requests send
  `If-None-Match`, a `304` reuses the cached body, and fresh entries
  (30 s) are served from memory. On revalidation the visible rows are
  patched in place instead of rebuilt; countdowns tick locally.
- Hash routes (`#/`, `#/bounty/<slug>`, `#/leaderboard/<slug>`,
  `#/profile/<handle>`) render from in-app links and from a direct URL
  alike.

## Layout

- `app/index.html` — the shell (styles inline) that boots the app
- `app/api.js` — the ETag cache, requests panel and row patching
- `app/board.js` — the shell, the persistent rail and the router
- `app/bounty.js`, `app/leaderboard.js`, `app/profile.js` — the views
- `main.ts` / `serve.ts` — build the hand-in dossier and serve the app
