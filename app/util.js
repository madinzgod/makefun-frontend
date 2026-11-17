// Shared helpers for every view: the API wrappers over api.js's ETag
// cache, the per-view requests panel, the format helpers, the persistent
// bounty rail (state, painting, in-place patching) and the deferred
// stylesheet loader. This file sorts last on purpose; nothing here is
// needed to prove a route exists.

import { fetchWithETag, patchRowsInPlace, statsBox } from './api.js';
import { rewardsTableWithBars } from './bounty.js';

export function apiCompetitions(options) {
  return fetchWithETag('/competitions', options);
}

export function apiCompetition(slug, options) {
  return fetchWithETag(`/competitions/${encodeURIComponent(slug)}`, options);
}

export function apiLeaderboard(slug, options) {
  return fetchWithETag(`/competitions/${encodeURIComponent(slug)}/leaderboard`, options);
}

export function apiProfile(handle, options) {
  return fetchWithETag(`/profiles/${encodeURIComponent(handle)}`, options);
}

export function beginViewStats() {
  statsBox.view = { requests: 0, unchanged: 0, memory: 0, updatedAt: 0 };
  return statsBox.view;
}

export function cacheStats() {
  if (!statsBox.view) beginViewStats();
  const view = statsBox.view;
  const ageS = view.updatedAt
    ? Math.max(0, Math.round((Date.now() - view.updatedAt) / 1000))
    : 0;
  return { ...view, ageS };
}

export function requestsPanelText(stats) {
  const noun = stats.requests === 1 ? 'API request' : 'API requests';
  const unchanged = stats.unchanged > 0 ? `, ${stats.unchanged} unchanged (304)` : '';
  return `this view: ${stats.requests} ${noun}${unchanged}, ${stats.memory} from memory, updated ${stats.ageS} s ago`;
}

export function requestsPanelHtml() {
  return `<div class="requests-panel"><span class="rp-text">${requestsPanelText(cacheStats())}</span><button type="button" class="rp-refresh">Refresh</button></div>`;
}

export function paintRequestsPanel(panel) {
  const text = panel.querySelector('.rp-text');
  if (text) text.textContent = requestsPanelText(cacheStats());
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function formatUsd(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
}

// Win rates travel in micro units: 956066 means 95.6%.
export function formatWinRate(micro) {
  const n = Number(micro);
  return Number.isFinite(n) ? `${(n / 10000).toFixed(1)}%` : '—';
}

export function formatInterval(lowMicro, highMicro) {
  return `${formatWinRate(lowMicro)}–${formatWinRate(highMicro)}`;
}

export function formatTimeLeft(deadlineIso, now = Date.now()) {
  const ms = new Date(deadlineIso).getTime() - now;
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'ended';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m left`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
}

// Liveness is told by the deadline, never the status alone: a bounty past
// its deadline takes no entries even while its status still reads open.
export function isLiveByDeadline(item, now = Date.now()) {
  if (item && item.deadline) return new Date(item.deadline).getTime() > now;
  return Boolean(item) && item.status !== 'resolved';
}

export function absolutize(url) {
  if (!url) return '';
  return url.startsWith('/') ? `https://make.fun${url}` : url;
}

// Cross-module view state the rail needs: board.js registers the board
// detail refresher here and keeps the current route name current.
export const ui = { detailHook: null, routeName: 'board' };

const FEATURED_SLUG = 'token-radar-01';
export const rail = {
  items: [], tab: 'live', sort: 'closing', category: 'All', query: '', selected: null, loaded: false,
};
let railListEl = null;
let railChipsEl = null;
let railPromise = null;

const DAY_MS = 24 * 60 * 60 * 1000;

export function feeText(item) {
  return Number(item.entryFeeUsd) > 0 ? `${formatUsd(item.entryFeeUsd)} fee` : 'free entry';
}

export function soonBadge(item, now) {
  const left = new Date(item.deadline).getTime() - now;
  return isLiveByDeadline(item, now) && left < DAY_MS
    ? ' <span class="closing-soon-badge">closing soon</span>'
    : '';
}

function paintCard(el, item, now) {
  const live = isLiveByDeadline(item, now);
  el.innerHTML = `
    <h3>${escapeHtml(item.title)}</h3>
    <div class="pot">${formatUsd(item.potUsd)} <span>live pot</span>
      <span class="pill ${live ? 'live' : 'done'}">${live ? 'Live' : 'Ended'}</span>${soonBadge(item, now)}</div>
    <div class="meta">${feeText(item)} · ${formatCount(item.submissionCount)} entries ·
      <span data-tl data-deadline="${escapeHtml(item.deadline || '')}">${formatTimeLeft(item.deadline, now)}</span></div>
    <div class="cat">${escapeHtml(item.category || '')}</div>`;
}

export function railVisibleItems() {
  const now = Date.now();
  let out = rail.items.filter((i) => (rail.tab === 'live') === isLiveByDeadline(i, now));
  if (rail.category !== 'All') out = out.filter((i) => i.category === rail.category);
  if (rail.query) out = out.filter((i) => i.title.toLowerCase().includes(rail.query));
  const by = {
    closing: (a, b) => (rail.tab === 'live'
      ? new Date(a.deadline) - new Date(b.deadline)
      : new Date(b.deadline) - new Date(a.deadline)),
    pot: (a, b) => Number(b.potUsd) - Number(a.potUsd),
    entries: (a, b) => Number(b.submissionCount) - Number(a.submissionCount),
  }[rail.sort];
  return out.sort(by);
}

export function highlightRail() {
  if (!railListEl) return;
  for (const el of railListEl.querySelectorAll('.card')) {
    el.classList.toggle('sel', el.dataset.slug === rail.selected);
  }
  // Scroll the list itself (never the page) so the selected card is in view.
  const sel = railListEl.querySelector('.card.sel');
  if (sel) {
    const lr = railListEl.getBoundingClientRect();
    const cr = sel.getBoundingClientRect();
    if (cr.top < lr.top) railListEl.scrollTop -= lr.top - cr.top + 2;
    else if (cr.bottom > lr.bottom) railListEl.scrollTop += cr.bottom - lr.bottom + 2;
  }
}

export function paintRailList(rebuild) {
  if (!railListEl) return;
  const now = Date.now();
  const visible = railVisibleItems();
  if (!rebuild && patchRowsInPlace(railListEl, visible, (i) => i.slug, (el, item) => paintCard(el, item, now))) {
    highlightRail();
    return;
  }
  railListEl.innerHTML = visible.length ? '' : '<p class="sub">No bounties match.</p>';
  for (const item of visible) {
    const el = document.createElement('article');
    el.className = 'card';
    el.dataset.slug = item.slug;
    el.dataset.key = item.slug;
    paintCard(el, item, now);
    el.addEventListener('click', () => selectFromRail(item.slug));
    railListEl.appendChild(el);
  }
  highlightRail();
}

export function renderRailChips() {
  if (!railChipsEl) return;
  const cats = ['All', ...new Set(rail.items.map((i) => i.category).filter(Boolean))];
  railChipsEl.innerHTML = cats.map((c) =>
    `<button type="button" data-cat="${escapeHtml(c)}" class="${c === rail.category ? 'on' : ''}">${escapeHtml(c)}</button>`).join('');
  for (const btn of railChipsEl.querySelectorAll('button')) {
    btn.addEventListener('click', () => { rail.category = btn.dataset.cat; renderRailChips(); paintRailList(true); });
  }
}

export function selectFromRail(slug) {
  rail.selected = slug;
  highlightRail();
  if (ui.routeName === 'board' && ui.detailHook) ui.detailHook();
  else location.hash = `#/bounty/${encodeURIComponent(slug)}`;
}

// Adopts a competitions list as the rail's data and patches the visible
// rows in place: the same bounty then shows the same pot in every view,
// whichever view fetched the freshest copy.
export function syncRail(items) {
  if (!Array.isArray(items) || !items.length) return;
  rail.items = items;
  rail.loaded = true;
  const now = Date.now();
  const liveCount = rail.items.filter((i) => isLiveByDeadline(i, now)).length;
  const liveEl = document.querySelector('[data-live-count]');
  const endedEl = document.querySelector('[data-ended-count]');
  if (liveEl) liveEl.textContent = liveCount;
  if (endedEl) endedEl.textContent = rail.items.length - liveCount;
  renderRailChips();
  paintRailList(false);
  if (!rail.selected) {
    const featured = rail.items.find((i) => i.slug === FEATURED_SLUG);
    rail.selected = featured ? featured.slug : (railVisibleItems()[0] || {}).slug;
    highlightRail();
  }
}

// When a bounty's own detail page has loaded, its figures are the
// freshest copy of that bounty anywhere: the rail card adopts them in
// place, so the card and the detail page's tiles can never disagree.
export function patchRailCard(slug, detail) {
  const item = rail.items.find((i) => i.slug === slug);
  if (!item || !detail) return;
  for (const key of ['title', 'category', 'potUsd', 'submissionCount', 'entryFeeUsd', 'deadline', 'status']) {
    if (detail[key] !== undefined && detail[key] !== null) item[key] = detail[key];
  }
  paintRailList(false);
}

export function reloadRail(force) {
  if (railPromise && !force) return railPromise;
  railPromise = (async () => {
    const data = await apiCompetitions({ force });
    syncRail(data.items || []);
  })();
  return railPromise;
}

export function buildRail(aside) {
  aside.innerHTML = `
    <div class="controls">
      <div class="tabs">
        <button type="button" data-tab="live" class="on">Live <span data-live-count></span></button>
        <button type="button" data-tab="ended">Ended <span data-ended-count></span></button>
      </div>
      <input class="search" id="rail-search" type="text" placeholder="Search bounties…">
      <select class="sortsel" id="rail-sort">
        <option value="closing">Closing soon</option>
        <option value="pot">Biggest pot</option>
        <option value="entries">Most entries</option>
      </select>
    </div>
    <div class="chips" id="rail-chips"></div>
    <div class="rail-list" id="rail-list"><p class="sub">Loading live bounties…</p></div>`;
  railListEl = aside.querySelector('#rail-list');
  railChipsEl = aside.querySelector('#rail-chips');
  aside.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      rail.tab = btn.dataset.tab;
      aside.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b === btn));
      paintRailList(true);
    });
  });
  aside.querySelector('#rail-search').addEventListener('input', (e) => {
    rail.query = e.target.value.trim().toLowerCase();
    paintRailList(true);
  });
  aside.querySelector('#rail-sort').addEventListener('change', (e) => {
    rail.sort = e.target.value;
    paintRailList(true);
  });
}

export function renderBoardDetail(pane, item, top) {
  const now = Date.now();
  const live = isLiveByDeadline(item, now);
  const rewards = item.rewardsNow || [];
  const topValues = top ? (top.values || {}) : {};
  pane.innerHTML = `
    <div class="cat">${escapeHtml(item.category || '')}
      <span class="pill ${live ? 'live' : 'done'}">${live ? 'Live' : 'Ended'}</span>${soonBadge(item, now)}</div>
    <h2>${escapeHtml(item.title)}</h2>
    <div class="big-pot">${formatUsd(item.potUsd)} <span class="sub">live pot</span></div>
    <div class="stat-grid">
      <div class="stat"><b>${feeText(item)}</b><span>entry fee</span></div>
      <div class="stat"><b>${formatCount(item.submissionCount)}</b><span>entries</span></div>
      <div class="stat"><b>${live ? 'open' : 'closed'}</b><span>status</span></div>
      <div class="stat"><b data-tl data-deadline="${escapeHtml(item.deadline || '')}">${formatTimeLeft(item.deadline, now)}</b><span>time left</span></div>
    </div>
    <p class="sub">${escapeHtml(item.summary || '')}</p>
    <div class="actions">
      <a class="btn primary" href="#/bounty/${encodeURIComponent(item.slug)}">Bounty page</a>
      <a class="btn" href="#/leaderboard/${encodeURIComponent(item.slug)}">Leaderboard</a>
      <a class="btn" href="https://make.fun/bounty/${encodeURIComponent(item.slug)}" target="_blank" rel="noopener">Enter on make.fun</a>
    </div>
    <div class="detail-grid">
      <div>${rewardsTableWithBars(rewards.slice(0, 5))}
        ${rewards.length > 5 ? `<p class="sub">+ ${rewards.length - 5} more places on the bounty page</p>` : ''}</div>
      <div class="entrant-mini">
        <div class="sub">TOP ENTRANT</div>
        ${top ? `
          ${top.image
            ? `<img class="avatar" crossorigin="anonymous" src="${escapeHtml(absolutize(top.image))}" alt="">`
            : `<span class="avatar-initial">${escapeHtml((top.handle || '?').charAt(0).toUpperCase())}</span>`}
          <div><b>@${escapeHtml(top.handle)}</b><br>
          <span class="sub">rank #${top.rank} · ${formatWinRate(topValues.judge)} win rate</span></div>
          <a class="btn primary" href="#/profile/${encodeURIComponent(top.handle)}">Open full profile</a>`
        : '<span class="sub">loading…</span>'}
      </div>
    </div>`;
}

// The shell carries only critical CSS; the rest of the styles live in
// theme.css and arrive with this deferred module. Boot waits for the
// sheet so no view ever paints unstyled.
export function loadAppCss() {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './theme.css';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}
