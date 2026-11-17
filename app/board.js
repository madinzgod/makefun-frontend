// The app shell: a persistent bounty rail on the left of every screen, the
// board's detail view, and the router. The shell loads this module by
// import(); every surface is reachable by link and by direct URL.

import {
  apiCompetitions, apiLeaderboard, absolutize, beginViewStats, escapeHtml,
  formatCount, formatTimeLeft, formatUsd, formatWinRate, isLiveByDeadline,
  paintRequestsPanel, patchRowsInPlace, requestsPanelHtml,
} from './api.js';
import { rewardsTableWithBars, routeBounty } from './bounty.js';
import { routeLeaderboard } from './leaderboard.js';
import { routeProfile } from './profile.js';

const FEATURED_SLUG = 'token-radar-01';
const rail = {
  items: [], tab: 'live', sort: 'closing', category: 'All', query: '', selected: null, loaded: false,
};
let railListEl = null;
let railChipsEl = null;
let railPromise = null;
let boardDetailHook = null;
let currentRouteName = 'board';

export function routeBoard(root) {
  root.innerHTML = `
    <div class="view-head">${requestsPanelHtml()}</div>
    <div class="board-detail" id="board-detail"><p class="sub">Loading…</p></div>`;
  const panel = root.querySelector('.requests-panel');
  const pane = root.querySelector('#board-detail');
  let detailToken = 0;

  const showDetail = async (force) => {
    const item = rail.items.find((i) => i.slug === rail.selected) || railVisibleItems()[0];
    if (!item) { pane.innerHTML = '<p class="sub">No bounties match.</p>'; return; }
    rail.selected = item.slug;
    highlightRail();
    const token = ++detailToken;
    renderBoardDetail(pane, item, null);
    let top = null;
    try {
      const lb = await apiLeaderboard(item.slug, { force });
      top = (lb.entries || [])[0] || null;
    } catch { /* the pane stands without its entrant card */ }
    if (token === detailToken) renderBoardDetail(pane, item, top);
  };
  boardDetailHook = () => showDetail(false);

  panel.querySelector('.rp-refresh').addEventListener('click', async () => {
    await reloadRail(true);
    await showDetail(true);
    paintRequestsPanel(panel);
  });
  const ticker = setInterval(() => {
    const now = Date.now();
    for (const el of document.querySelectorAll('[data-tl]')) {
      el.textContent = formatTimeLeft(el.dataset.deadline, now);
    }
    paintRequestsPanel(panel);
  }, 1000);

  (async () => {
    await reloadRail(false);
    await showDetail(false);
    paintRequestsPanel(panel);
    window.__shotReady = true;
  })().catch((err) => {
    pane.innerHTML = `<div class="error-box">Could not load the board: ${escapeHtml(err.message)}</div>`;
    window.__shotReady = true;
  });
  return () => { boardDetailHook = null; clearInterval(ticker); };
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

const DAY_MS = 24 * 60 * 60 * 1000;

function feeText(item) {
  return Number(item.entryFeeUsd) > 0 ? `${formatUsd(item.entryFeeUsd)} fee` : 'free entry';
}

function soonBadge(item, now) {
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

function railVisibleItems() {
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

function highlightRail() {
  if (!railListEl) return;
  for (const el of railListEl.querySelectorAll('.card')) {
    el.classList.toggle('sel', el.dataset.slug === rail.selected);
  }
}

function paintRailList(rebuild) {
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

function renderRailChips() {
  if (!railChipsEl) return;
  const cats = ['All', ...new Set(rail.items.map((i) => i.category).filter(Boolean))];
  railChipsEl.innerHTML = cats.map((c) =>
    `<button type="button" data-cat="${escapeHtml(c)}" class="${c === rail.category ? 'on' : ''}">${escapeHtml(c)}</button>`).join('');
  for (const btn of railChipsEl.querySelectorAll('button')) {
    btn.addEventListener('click', () => { rail.category = btn.dataset.cat; renderRailChips(); paintRailList(true); });
  }
}

function selectFromRail(slug) {
  rail.selected = slug;
  highlightRail();
  if (currentRouteName === 'board' && boardDetailHook) boardDetailHook();
  else location.hash = `#/bounty/${encodeURIComponent(slug)}`;
}

function reloadRail(force) {
  if (railPromise && !force) return railPromise;
  railPromise = (async () => {
    const data = await apiCompetitions({ force });
    rail.items = data.items || [];
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
  })();
  return railPromise;
}

function buildRail(aside) {
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

let cleanupView = null;

function mount(viewFn) {
  window.__shotReady = false;
  if (cleanupView) {
    try { cleanupView(); } catch { /* a stale view's cleanup is best-effort */ }
    cleanupView = null;
  }
  beginViewStats();
  const view = document.getElementById('view');
  view.innerHTML = '';
  cleanupView = viewFn(view) || null;
}

export function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
    return { name: 'leaderboard', slug: parts[1] };
  }
  if (parts[0] === 'bounty' && parts[1]) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'leaderboard' && parts[1]) return { name: 'leaderboard', slug: parts[1] };
  if ((parts[0] === 'profile' || parts[0] === 'u') && parts[1]) {
    return { name: 'profile', handle: parts[1] };
  }
  return { name: 'board' };
}

export function dispatchRoute() {
  const route = parseRoute(location.hash);
  currentRouteName = route.name;
  if (route.slug) {
    rail.selected = route.slug;
    highlightRail();
  }
  if (route.name === 'bounty') mount((root) => routeBounty(root, route.slug));
  else if (route.name === 'leaderboard') mount((root) => routeLeaderboard(root, route.slug));
  else if (route.name === 'profile') mount((root) => routeProfile(root, route.handle));
  else mount((root) => routeBoard(root));
}

export function bootApp() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="shell"><aside id="rail"></aside><div id="view"></div></div>';
  buildRail(app.querySelector('#rail'));
  reloadRail(false).catch(() => {});
  const form = document.getElementById('profileLookup');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const handle = document.getElementById('handleInput').value.trim().replace(/^@/, '');
    if (handle) location.hash = `#/profile/${encodeURIComponent(handle)}`;
  });
  window.addEventListener('hashchange', dispatchRoute);
  dispatchRoute();
}

bootApp();
