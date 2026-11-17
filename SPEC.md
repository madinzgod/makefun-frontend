# Build brief: a make.fun frontend (competition makefun-frontend-01)

You are building a complete entry for the make.fun bounty "Build the best make.fun
frontend" (deadline 2026-11-17T12:30:00Z — work efficiently). The entry is a static
frontend for make.fun plus a small Node program that hands it in. An AI judge compares
entries pairwise; criteria, most important first:

1. **Fully functioning** — four surfaces working on live data (below), screenshots and
   code agreeing. A missing/broken/placeholder surface loses to one that has it.
2. **Performance** — API answers cached/revalidated (ETag), few requests per view,
   views updated without rebuilding the whole page, long lists paginated or capped.
3. **Speed** — tiny first load: the dossier's Load Totals line (gzipped bytes of
   index.html + its CSS + its module graph) should be as small as possible. No framework.
4. **Ease of use** — clear navigation/hierarchy, readable type and contrast, reward,
   entry fee and time left easy to find, layout that works on a phone.

Reference material you may READ (write your own fresh code; do not copy files in):
the kit at `/home/hatch/workspace/makefun/frontend/makefun-frontend-01-kit/`
(`RULES.txt` is the full rulebook; `starter/` is a working minimal entry whose
dossier is the house's "2-plain" anchor — beat it by adding the missing surfaces,
polish and speed).

## Deliverables (all inside this repository)

- `app/index.html`, `app/style.css`, `app/main.js`, `app/api.js`, `app/format.js`,
  `app/views.js` — the frontend: plain static files, ES modules, no build step.
- `main.ts` — Node >= 22, standard library only, plain JS-compatible TypeScript
  (Node type-stripping must run it directly). It copies `app/` and `screenshots/`
  from beside itself to `process.env.MAKEFUN_OUTPUT_DIR ?? '/output'` and writes
  `dossier.json` there with `buildDossier` imported from `./vendor/makefun-frontend.ts`,
  called with exactly these options:
  `{ text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }`.
- `serve.ts` — a small static server for `app/` (default port 8080, `--port N`),
  correct MIME types for .html/.css/.js/.mjs/.json/.png/.jpg/.svg/.ico.
- `vendor/makefun-frontend.ts` — copy UNCHANGED from
  `/home/hatch/workspace/makefun/frontend/makefun-frontend-01-kit/starter/vendor/makefun-frontend.ts`.
- `LICENSE` — the standard MIT license text, copyright holder `madinzgod`.
- `shots.json` — the three screenshots (format like the starter's shots.json).
- `screenshots/` — the three screenshots (see below).
- `README.md` — a few lines: what it is, how to serve, how to build the dossier.

## The app

Hash routes, each reachable by a link and by its own URL:

- `#/` — **Board.** `GET https://make.fun/api/competitions?status=open&activity=times`
  returns `{ items: [...] }`; each item has `slug, title, rewardAmount, potUsd,
  entryFeeUsd, deadline, submissionCount, category, skills`. One card per bounty:
  title (link to its page), live pot (`potUsd ?? rewardAmount`) shown prominently,
  entry fee when `entryFeeUsd` is set, time left until `deadline` (a bounty past its
  deadline is "Closed" — judge by deadline, never by the status field), entries count.
  Add a sort control (Ending soon / Biggest pot / Most entries) and a text filter;
  re-render only the list, not the whole page.
- `#/bounty/<slug>` — **Bounty page.** `GET /api/competitions/<slug>`: title, summary,
  status, deadline + time left, entries count, entry fee, live pot, a rewards table
  from `rewards` (an object `{"1": 100, "2": 70, ...}`; when `rewardsNow` is present
  prefer it — it includes the fee split), description and rules. Description/rules are
  untrusted text: HTML-escape them, render paragraphs/line breaks as text, never inject
  them as markup. Long rules go in a `<details>` element. Link to the leaderboard.
- `#/bounty/<slug>/leaderboard` — **Leaderboard.** `GET /api/competitions/<slug>/leaderboard`
  returns an envelope: `competition`, `phase`, `columns` (array of `{key, title}`),
  and an entries array (find it at runtime — check `entries`, `items`, `rows` at the
  top level and under `leaderboard`). Render a table: rank, entrant (handle — link to
  `#/u/<handle>` when a handle field exists), entry title, and the judge win rate as a
  percentage when present. Tolerate missing fields; if there are no entries yet, say so
  plainly (placements may be held) and still show the phase title. Cap the render at
  100 rows with a "show all" button if longer.
- `#/u/<handle>` — **Profile.** `GET /api/profiles/<handle>` returns `handle,
  display_name, bio, image, avatar, github_login, wallet {address, explorer_url},
  joined_at, record {competitions_entered, competitions_placed, competitions_won,
  podium_finishes, best_placement, prize_usd}, solutions [{title, competition {slug,
  title}}]`. Show avatar (`image ?? avatar ?? /api/profiles/<handle>/picture.png`,
  `<img crossorigin="anonymous" alt="">`), name, @handle, bio, joined date, the record
  as a stat grid, wallet (shortened, linked to explorer_url), GitHub link when present,
  and the solutions list linking to each bounty page.

## Engineering rules

- `api.js`: an ETag cache — a Map from URL to `{etag, data}` plus one shared in-flight
  promise per URL; send `If-None-Match` when a tag is stored; on 304 reuse the stored
  data; also keep a 30-second soft TTL so repeat views inside 30 s make no request.
  (The API's ETags are bound to the minute.) On HTTP error, throw; views show a friendly
  error with a retry button.
- Every route sets `window.__shotReady = false` when it starts loading and `true` once
  its data has rendered (also on the error path).
- Escape every API string with an `esc()` helper before it enters HTML. No inline event
  handlers, no `eval`, no computed `import()`, no `createElement('script')`. Navigation
  is real `<a href="#/...">` links; the router listens to `hashchange`.
- Accessibility: semantic landmarks (header/nav/main/footer), a skip link, an
  `aria-live="polite"` announcer for route changes, visible focus outlines, good
  contrast. Keep the heading hierarchy sane.
- Design: one CSS file, system font stack (no webfonts), CSS custom properties, a clean
  modern look — light background, dark text, one accent colour, cards with subtle
  borders/shadows, sticky header with the app name and a Board link. Responsive:
  board grid 1 column under 640px, 2 on tablets, 3 on desktop. The pot is the biggest
  number on each card. Time-left text updates from one shared 30 s interval per view
  (cleared on route change), touching only the countdown nodes.
- Keep the whole first load (index.html + style.css + main.js + api.js + format.js +
  views.js) under ~25 KB raw. No images or fonts inside `app/` (avatars load from the
  API at runtime; runtime images are not file references).
- The only origin the code may name besides the app itself is `https://make.fun`.

## Screenshots

Tooling lives OUTSIDE the repo at `/home/hatch/workspace/makefun/frontend/tools/`:
`npm init -y && npm install puppeteer --no-bin-links` there (downloads Chrome), then
write `shots.mjs` there: start `node serve.ts --port 8123` from this repo as a child
process, open each route with puppeteer, wait for `window.__shotReady === true`
(30 s timeout), and save JPEG quality 80:

1. `screenshots/1-board.jpg` — `#/`, viewport 1280x800 (the cover).
2. `screenshots/2-bounty.jpg` — `#/bounty/makefun-frontend-01`, viewport 1280x800.
3. `screenshots/3-mobile.jpg` — `#/`, viewport 390x844.

Each file must be <= 256 KiB, long side <= 1280 px, short side >= 360 px. Then write
`shots.json` in the repo root listing the three (file, path, viewport) in the starter's
format.

## Verify before you finish

- `node serve.ts --port 8123` serves the app; the four routes return data-backed HTML
  in a real browser (your shots run proves it).
- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` succeeds; `out/` holds `app/`,
  `screenshots/` and `dossier.json`. Report the dossier's Load Totals line (first-load
  files, gzip and raw bytes).
- `git add -A && git commit -m "make.fun frontend: board, bounty, leaderboard, profile"`.
  Do not push; leave that to the caller.
