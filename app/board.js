// The app shell's router and board view. The shell loads this module by
// import(); every surface is reachable by link and by direct URL. The
// rail, the requests panel and the format helpers live in util.js; the
// ETag cache lives in api.js.

import {
  apiLeaderboard, beginViewStats, buildRail, escapeHtml, formatTimeLeft,
  highlightRail, loadAppCss, paintRequestsPanel, rail, railVisibleItems,
  reloadRail, renderBoardDetail, requestsPanelHtml, ui,
} from './util.js';
import { routeBounty } from './bounty.js';
import { routeLeaderboard } from './leaderboard.js';
import { routeProfile } from './profile.js';

let cleanupView = null;

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
  ui.detailHook = () => showDetail(false);

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
  return () => { ui.detailHook = null; clearInterval(ticker); };
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
  const mount = (viewFn) => {
    window.__shotReady = false;
    if (cleanupView) {
      try { cleanupView(); } catch { /* a stale view's cleanup is best-effort */ }
      cleanupView = null;
    }
    beginViewStats();
    const view = document.getElementById('view');
    view.innerHTML = '';
    cleanupView = viewFn(view) || null;
  };
  const route = parseRoute(location.hash);
  ui.routeName = route.name;
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

loadAppCss().then(() => bootApp());
