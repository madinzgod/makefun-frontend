# make.fun frontend — entry for makefun-frontend-01

A fast, lightweight static frontend for [make.fun](https://make.fun), built with
plain HTML, CSS and ES modules — no framework, no build step. It reads make.fun's
public API only (read-only, no sign-in) and has four surfaces on hash routes:

- `#/` — the board of open bounties: live pot, entry fee, time left, entry count,
  with text filter and sorting (ending soon / biggest pot / most entries).
- `#/bounty/<slug>` — a bounty's page: facts, rewards table (live fee split when
  the API reports it), description and rules, all rendered as escaped text.
- `#/bounty/<slug>/leaderboard` — the leaderboard: rank, entrant, entry and the
  judge win rate, capped at 100 rows with a "show all" button.
- `#/u/<handle>` — a public profile: avatar, record as a stat grid, wallet,
  GitHub link and the account's entries.

API answers are cached with their ETags (30 s soft TTL, then `If-None-Match`
revalidation), repeat views share one in-flight request, and a single 30 s
interval per view refreshes only the countdown text.

## Serve it locally

```
node serve.ts            # http://localhost:8080
node serve.ts --port N   # another port
```

## Build the dossier

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json`
with `vendor/makefun-frontend.ts` (the kit's library, unchanged).

## License

MIT — see `LICENSE`.
