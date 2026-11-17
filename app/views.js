// The four surfaces, each a function from API data to an HTML string. Every API
// string is escaped with esc(); countdown spans carry data-until so the router's
// one shared interval can refresh just their text.

import { bytes, date, day, esc, money, paragraphs, percent, shortAddress, timeLeft } from './format.js';

const bountyHref = (slug) => `#/bounty/${encodeURIComponent(slug)}`;
const profileHref = (handle) => `#/u/${encodeURIComponent(handle)}`;
const potOf = (b) => money(b.potUsd ?? b.rewardAmount); // live pot: prize + fees paid in
const until = (iso) => `<span data-until="${esc(iso)}">${esc(timeLeft(iso))}</span>`;
const entriesLabel = (n) => `${Number(n) || 0} ${Number(n) === 1 ? 'entry' : 'entries'}`;

/* Board */

export function boardCard(b) {
  const closed = new Date(b.deadline).getTime() <= Date.now();
  return `<article class="card${closed ? ' is-closed' : ''}">
    <h3 class="card-title"><a href="${bountyHref(b.slug)}">${esc(b.title)}</a></h3>
    <p class="pot">${esc(potOf(b))}</p>
    <p class="pot-note">live pot</p>
    <ul class="meta">
      <li>${closed ? 'Closed' : until(b.deadline)}</li>
      <li>${esc(entriesLabel(b.submissionCount))}</li>
      <li>${b.entryFeeUsd ? `${esc(money(b.entryFeeUsd))} entry fee` : 'Free to enter'}</li>
      ${b.category ? `<li>${esc(b.category)}</li>` : ''}
    </ul></article>`;
}

export function boardList(items) {
  if (!items.length) return '<p class="empty">No open bounties match. Try clearing the filter.</p>';
  return `<div class="grid">${items.map(boardCard).join('')}</div>`;
}

export function boardView(items) {
  return `<h1>Open bounties</h1>
  <p class="lede">Live competitions on make.fun. The pot grows as entry fees are paid in.</p>
  <div class="controls">
    <label class="grow">Filter
      <input id="filter" type="search" placeholder="Search titles, categories, skills…" autocomplete="off">
    </label>
    <label>Sort
      <select id="sort">
        <option value="ending">Ending soon</option>
        <option value="pot">Biggest pot</option>
        <option value="entries">Most entries</option>
      </select>
    </label>
  </div>
  <div id="board-list">${boardList(items)}</div>`;
}

/* Bounty page */

function rewardsTable(b) {
  if (Array.isArray(b.rewardsNow) && b.rewardsNow.length) {
    const rows = b.rewardsNow.map((r) =>
      `<tr><td>${esc(r.place)}</td><td>${esc(money(r.baseUsd))}</td><td>${esc(money(r.feeShareUsd))}</td><td><strong>${esc(money(r.amountUsd))}</strong></td></tr>`).join('');
    return `<table class="tbl"><thead><tr><th>Place</th><th>Prize</th><th>Fee share</th><th>Total now</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  if (b.rewards && typeof b.rewards === 'object') {
    const rows = Object.keys(b.rewards).sort((a, c) => Number(a) - Number(c))
      .map((place) => `<tr><td>${esc(place)}</td><td><strong>${esc(money(b.rewards[place]))}</strong></td></tr>`).join('');
    return `<table class="tbl"><thead><tr><th>Place</th><th>Prize</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  return '<p class="empty">No reward table published yet.</p>';
}

export function bountyView(b, slug) {
  const closed = new Date(b.deadline).getTime() <= Date.now();
  const rules = b.rules ? String(b.rules) : '';
  const rulesBlock = rules.length > 1200
    ? `<details class="rules"><summary>Rules</summary><div class="prose">${paragraphs(rules)}</div></details>`
    : rules ? `<h2>Rules</h2><div class="prose">${paragraphs(rules)}</div>` : '';
  return `<p class="crumbs"><a href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  ${b.summary ? `<p class="lede">${esc(b.summary)}</p>` : ''}
  <section class="stats" aria-label="Bounty facts">
    <div class="stat"><span class="stat-num pot-big">${esc(potOf(b))}</span><span class="stat-label">Live pot</span></div>
    <div class="stat"><span class="stat-num">${b.entryFeeUsd ? esc(money(b.entryFeeUsd)) : 'Free'}</span><span class="stat-label">Entry fee</span></div>
    <div class="stat"><span class="stat-num">${esc(Number(b.submissionCount) || 0)}</span><span class="stat-label">Entries</span></div>
    <div class="stat"><span class="stat-num">${closed ? 'Closed' : until(b.deadline)}</span><span class="stat-label">Deadline · ${esc(date(b.deadline))}</span></div>
  </section>
  <p><a class="button" href="${bountyHref(slug)}/leaderboard">View the leaderboard</a></p>
  <h2>Rewards</h2>
  ${rewardsTable(b)}
  ${b.description ? `<h2>About</h2><div class="prose">${paragraphs(b.description)}</div>` : ''}
  ${rulesBlock}
  ${Array.isArray(b.skills) && b.skills.length ? `<h2>Skills</h2><ul class="chips">${b.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}`;
}

/* Leaderboard */

/** The entries array, wherever this envelope keeps it. */
export function leaderboardEntries(data) {
  for (const pool of [data, data.leaderboard, data.results]) {
    if (!pool || typeof pool !== 'object') continue;
    for (const key of ['entries', 'items', 'rows']) {
      if (Array.isArray(pool[key])) return pool[key];
    }
  }
  return [];
}

function leaderboardColumns(data) {
  const cols = Array.isArray(data.columns) ? data.columns.filter((c) => c && !c.hidden && c.key) : [];
  return cols.length ? cols : [{ key: data.rank_key || 'judge', title: 'Win rate' }];
}

function cellText(entry, col, rankKey) {
  const raw = entry.values ? entry.values[col.key] : undefined;
  const shown = entry.display ? entry.display[col.key] : undefined;
  if (col.key === 'valid') return raw === 1 || shown === '1' ? '✓' : '—';
  if (col.key === 'bytes') return esc(bytes(raw ?? shown));
  const micro = typeof col.source === 'string' && col.source.includes('micro');
  if (raw != null && (micro || col.key === rankKey || col.key.startsWith(`${rankKey}_`))) return esc(percent(raw));
  return esc(shown ?? raw ?? '');
}

export function leaderboardRows(data, limit) {
  const cols = leaderboardColumns(data);
  const rankKey = data.rank_key || data.leaderboard?.rankKey || 'judge';
  return leaderboardEntries(data).slice(0, limit).map((e, i) => {
    const handle = e.handle || e.entrant || e.username;
    const entrant = handle ? `<a href="${profileHref(handle)}">@${esc(handle)}</a>` : esc(e.display_name || '—');
    const cells = cols.map((c) => `<td>${cellText(e, c, rankKey)}</td>`).join('');
    return `<tr><td class="rank">${esc(e.rank ?? e.prize_rank ?? i + 1)}</td><td>${entrant}</td><td>${esc(e.title || '')}</td>${cells}</tr>`;
  }).join('');
}

export function leaderboardView(data, slug, limit = 100) {
  const entries = leaderboardEntries(data);
  const cols = leaderboardColumns(data);
  const comp = data.competition || {};
  const phase = data.phase && typeof data.phase === 'object' ? data.phase.title : data.phase;
  const head = cols.map((c) => `<th scope="col">${esc(c.title || c.key)}</th>`).join('');
  const table = entries.length
    ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th><th scope="col">Entry</th>${head}</tr></thead>
        <tbody id="lb-body">${leaderboardRows(data, limit)}</tbody></table></div>
      ${entries.length > limit ? `<p class="more"><button type="button" class="button" data-show-all>Show all ${entries.length} entries</button></p>` : ''}`
    : '<p class="empty">No entries on the board yet — placements may still be held for this phase.</p>';
  return `<p class="crumbs"><a href="${bountyHref(slug)}">← Back to the bounty</a></p>
  <h1>${esc(comp.title || data.title || slug)} — leaderboard</h1>
  <p class="lede">${esc(phase || data.title || 'Results')}${data.placements_held ? ' · placements held until the phase finalizes' : ''}</p>
  ${table}`;
}

/* Profile */

/** An avatar URL from the profile's fields, made absolute on make.fun. */
function avatarUrl(p, handle) {
  const raw = (typeof p.image === 'string' && p.image)
    || (typeof p.avatar === 'string' && p.avatar)
    || (p.avatar && typeof p.avatar === 'object' && p.avatar.url)
    || `/api/profiles/${encodeURIComponent(handle)}/picture.png`;
  return raw.startsWith('http') ? raw : `https://make.fun${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export function profileView(p, handle) {
  const record = p.record || {};
  const stats = [
    ['Entered', record.competitions_entered],
    ['Placed', record.competitions_placed],
    ['Won', record.competitions_won],
    ['Podiums', record.podium_finishes],
    ['Best placement', record.best_placement ? `#${record.best_placement}` : null],
    ['Prizes won', record.prize_usd != null ? money(record.prize_usd) : null],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');
  const wallet = p.wallet && p.wallet.address
    ? `<p>Wallet ${p.wallet.explorer_url
        ? `<a href="${esc(p.wallet.explorer_url)}" target="_blank" rel="noopener"><code>${esc(shortAddress(p.wallet.address))}</code></a>`
        : `<code>${esc(shortAddress(p.wallet.address))}</code>`}</p>`
    : '';
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];
  const solutionList = solutions.length
    ? `<ul class="solutions">${solutions.map((s) => {
        const comp = s.competition || {};
        const link = comp.slug ? `<a href="${bountyHref(comp.slug)}">${esc(s.title || comp.title || 'Entry')}</a>` : esc(s.title || 'Entry');
        return `<li>${link}${comp.title && s.title ? ` <span class="muted">in ${esc(comp.title)}</span>` : ''}</li>`;
      }).join('')}</ul>`
    : '<p class="empty">No entries yet.</p>';
  return `<div class="profile-head">
    <img class="avatar" crossorigin="anonymous" alt="" width="72" height="72" src="${esc(avatarUrl(p, handle))}">
    <div>
      <h1>${esc(p.display_name || p.handle || handle)}</h1>
      <p class="handle">@${esc(p.handle || handle)}${p.joined_at ? ` · joined ${esc(day(p.joined_at))}` : ''}</p>
    </div>
  </div>
  ${p.bio ? `<div class="prose">${paragraphs(p.bio)}</div>` : ''}
  ${stats.length ? `<section class="stats" aria-label="Record">${stats.map(([label, v]) => `<div class="stat"><span class="stat-num">${esc(v)}</span><span class="stat-label">${esc(label)}</span></div>`).join('')}</section>` : ''}
  ${wallet}
  ${p.github_login ? `<p>GitHub: <a href="https://github.com/${esc(encodeURIComponent(p.github_login))}" target="_blank" rel="noopener">@${esc(p.github_login)}</a></p>` : ''}
  <h2>Entries</h2>
  ${solutionList}`;
}

/* States */

export function errorView(message) {
  return `<div class="error" role="alert">
    <h1>That page could not be loaded</h1>
    <p>${esc(message)}</p>
    <p><button type="button" class="button" data-retry>Try again</button></p>
  </div>`;
}

export function notFoundView() {
  return `<div class="error">
    <h1>Page not found</h1>
    <p>That address does not match a board, bounty, leaderboard or profile.</p>
    <p><a class="button" href="#/">Go to the board</a></p>
  </div>`;
}
