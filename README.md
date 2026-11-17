[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/madinzgod/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/madinzgod/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# Splitboard — a featherweight make.fun frontend

A static, dependency-free frontend for make.fun whose first load is a single
759-byte shell: everything else arrives by `import()` after first paint.

- **Master-detail board** (`#/`): the live bounty list beside the selected
  bounty's full detail — live pot, entry fee, entries, time left, the rewards
  table from `rewardsNow`, and its current top 5. Live / Ended tabs, a sort
  control (biggest pot, ending soon, most entries), category chips and search.
  Cards are built once and patched in place on refresh; countdowns tick locally.
- **Bounty pages** (`#/bounty/<slug>`): summary, full description and rules,
  rewards table, dates and status (liveness is read off the deadline, per the
  kit's note, not the status flag alone).
- **Virtual leaderboard** (`#/leaderboard/<slug>`): the whole ranked table —
  win rate and 90% interval for every entry — windowed so only the rows on
  screen exist in the DOM, with a filter box.
- **Full profiles** (`#/profile/<handle>`): avatar, every record stat the API
  returns, all entries with scores, placements and prizes, and payouts.

Performance the code shows, not just claims: an ETag-revalidating API cache
(`If-None-Match`, 304 reuse, 30 s freshness, shared across views), a live
"⚡ N requests · M cached" counter in the header, and one request per view.
Dark theme in make.fun's own colours, system font stack, no external assets.

Run it with `node serve.ts`, hand it in with `node main.ts`.
