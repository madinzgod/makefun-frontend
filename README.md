[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/madinzgod/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/madinzgod/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# Lean Live Frontend for make.fun

A dependency-free static frontend for make.fun, built for the
makefun-frontend-01 bounty. Six small files under `app/` (about 10 KB
gzipped on first load, no framework, no build step) render four surfaces
from make.fun's public API, each reachable by a link and by its own URL:

- `#/` — the board: every competition with its live pot, entry fee,
  entries count and time left.
- `#/bounty/<slug>` — a bounty's page: summary, live pot, the rewards
  table with fee shares, dates, status read off the deadline, and rules.
- `#/leaderboard/<slug>` — the bounty's ranked leaderboard with win rates.
- `#/profile/<handle>` — a public profile: avatar, record and entries.

`app/api.js` caches API answers per URL with their ETags: an answer under
30 seconds old is served with no request, an older one is revalidated with
If-None-Match and reused on a 304, so moving between surfaces repeats few
requests.

Run it with `node serve.ts` and open http://localhost:8080. `node main.ts`
(with `MAKEFUN_OUTPUT_DIR` set) hands the entry in: it copies `app/` and
`screenshots/` out and writes the dossier built by
`vendor/makefun-frontend.ts`.
