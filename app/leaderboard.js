// A bounty's leaderboard: every ranked entry in one virtual list — only
// the rows inside the scroll window are in the DOM. Win rate ± 90% interval.

import {
  apiCompetition, apiLeaderboard, absolutize, escapeHtml, formatInterval,
  formatUsd, formatWinRate, paintRequestsPanel, requestsPanelHtml,
} from './util.js';

export function routeLeaderboard(root, slug) {
  root.innerHTML = `
    <div class="view-head"><a class="back-link" href="#/bounty/${encodeURIComponent(slug)}">← Bounty page</a>${requestsPanelHtml()}</div>
    <div class="lb-page">
      <h1 class="page" id="lb-title">Leaderboard</h1>
      <div id="lb-note"></div>
      <div class="lb-tools">
        <input class="search" id="lb-filter" type="text" placeholder="Filter by handle…">
        <span id="lb-status">loading…</span>
      </div>
      <div class="lb-wrap">
        <div class="lb-scroll" id="lb-scroll">
          <table class="lb"><thead><tr>
            <th>Rank</th><th>Entrant</th><th id="lb-rate-head">Win rate · 90% interval</th>
          </tr></thead><tbody id="lb-body"></tbody></table>
        </div>
        <aside class="entrant-card" id="entrant-card"><p class="sub">Loading entries…</p></aside>
      </div>
    </div>`;
  const panel = root.querySelector('.requests-panel');
  const view = {
    scroller: root.querySelector('#lb-scroll'),
    body: root.querySelector('#lb-body'),
    status: root.querySelector('#lb-status'),
    entries: [],
    selected: null,
    rewards: [],
  };
  const card = root.querySelector('#entrant-card');
  let all = [];
  let rafPending = false;

  const applyFilter = (query) => {
    const q = query.trim().toLowerCase();
    view.entries = q
      ? all.filter((e) => e.handle.toLowerCase().includes(q) || (e.title || '').toLowerCase().includes(q))
      : all;
    view.scroller.scrollTop = 0;
    renderVirtualList(view);
  };

  const onScroll = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; renderVirtualList(view); });
  };
  view.scroller.addEventListener('scroll', onScroll);
  view.body.addEventListener('click', (e) => {
    const tr = e.target.closest('tr.lb-row');
    if (!tr) return;
    view.selected = tr.dataset.handle;
    renderVirtualList(view);
    selectEntrant(card, view.entries.find((x) => x.handle === view.selected), view.rewards);
  });
  root.querySelector('#lb-filter').addEventListener('input', (e) => applyFilter(e.target.value));
  const onResize = () => renderVirtualList(view);
  window.addEventListener('resize', onResize);

  const load = async (force) => {
    const data = await apiLeaderboard(slug, { force });
    all = data.entries || [];
    try {
      const detail = await apiCompetition(slug, { force });
      view.rewards = detail.rewardsNow || [];
    } catch { /* the board stands without prize amounts */ }
    const firstValues = all.length ? (all[0].values || {}) : {};
    root.querySelector('#lb-rate-head').textContent =
      firstValues.judge !== undefined ? 'Win rate · 90% interval' : 'Elo · W-D-L';
    const comp = data.competition || {};
    root.querySelector('#lb-title').textContent = `${comp.title || slug} — leaderboard`;
    const phase = data.phase || {};
    root.querySelector('#lb-note').innerHTML = phase.finalized_at
      ? ''
      : `<p class="provisional-note">Provisional standings — this board is not final; the final heat re-judges every entry afresh.</p>`;
    if (!view.selected && all.length) view.selected = all[0].handle;
    applyFilter(root.querySelector('#lb-filter').value || '');
    selectEntrant(card, all.find((x) => x.handle === view.selected) || all[0], view.rewards);
    paintRequestsPanel(panel);
    window.__shotReady = true;
  };
  panel.querySelector('.rp-refresh').addEventListener('click', () => load(true).catch(() => {}));

  load(false).catch((err) => {
    root.querySelector('#lb-title').textContent = 'Leaderboard not found';
    view.body.innerHTML = /404/.test(err.message)
      ? `<tr><td colspan="3">No bounty named “${escapeHtml(slug)}” exists on make.fun.</td></tr>`
      : `<tr><td colspan="3">Could not load the leaderboard: ${escapeHtml(err.message)}</td></tr>`;
    view.status.textContent = 'rows 0 to 0 of 0 ranked, 0 in the DOM';
    window.__shotReady = true;
  });
  return () => window.removeEventListener('resize', onResize);
}

export function renderVirtualList(view) {
  const {
    scroller, body, status, entries, selected,
  } = view;
  const rowH = window.innerWidth <= 860 ? 56 : 38;
  const total = entries.length;
  const start = Math.max(0, Math.floor(scroller.scrollTop / rowH) - 3);
  const end = Math.min(total, Math.ceil((scroller.scrollTop + scroller.clientHeight) / rowH) + 3);
  let html = '';
  if (start > 0) html += `<tr class="lb-spacer"><td colspan="3" style="height:${start * rowH}px;padding:0;border:0"></td></tr>`;
  for (let i = start; i < end; i += 1) {
    const e = entries[i];
    const v = e.values || {};
    const paid = e.prize_eligible && e.rank <= 20;
    const rateCell = v.judge !== undefined
      ? `${formatWinRate(v.judge)} <span>${formatInterval(v.judge_low, v.judge_high)}</span>`
      : `${v.elo ?? '—'} <span>${v.wins ?? 0}W ${v.draws ?? 0}D ${v.losses ?? 0}L</span>`;
    html += `<tr class="lb-row${e.handle === selected ? ' sel' : ''}" data-handle="${escapeHtml(e.handle)}">
      <td>#${e.rank}${paid ? ' <span class="prize-badge">prize</span>' : ''}</td>
      <td><b>@${escapeHtml(e.handle)}</b></td>
      <td class="rate">${rateCell}</td></tr>`;
  }
  if (end < total) html += `<tr class="lb-spacer"><td colspan="3" style="height:${(total - end) * rowH}px;padding:0;border:0"></td></tr>`;
  body.innerHTML = html || '<tr><td colspan="3">No entries match.</td></tr>';
  const shown = Math.max(0, end - start);
  status.textContent = total
    ? `rows ${start + 1} to ${end} of ${total} ranked, ${shown} in the DOM`
    : 'rows 0 to 0 of 0 ranked, 0 in the DOM';
}

export function selectEntrant(card, entry, rewards) {
  if (!entry) {
    card.innerHTML = '<p class="sub">Select an entrant to see their card.</p>';
    return;
  }
  const reward = (rewards || []).find((r) => Number(r.place) === Number(entry.rank));
  const v = entry.values || {};
  const avatar = entry.image ? absolutize(entry.image) : '';
  const scoreHtml = v.judge !== undefined
    ? `<div class="rate">${formatWinRate(v.judge)}</div>
    <p class="sub">win rate, 90% interval ${formatInterval(v.judge_low, v.judge_high)}<br>`
    : `<div class="rate">${v.elo ?? '—'}</div>
    <p class="sub">Elo · ${v.wins ?? 0}W ${v.draws ?? 0}D ${v.losses ?? 0}L · ${v.spare_plies ?? 0} spare plies<br>`;
  card.innerHTML = `
    ${avatar
      ? `<img class="avatar" crossorigin="anonymous" src="${escapeHtml(avatar)}" alt="">`
      : `<span class="avatar-initial">${escapeHtml((entry.handle || '?').charAt(0).toUpperCase())}</span>`}
    <h3>@${escapeHtml(entry.handle)}</h3>
    ${scoreHtml}
    rank #${entry.rank}${entry.prize_eligible && entry.rank <= 20 ? ' · <span class="prize-badge">paid place</span>' : ''}</p>
    ${reward ? `<p class="sub">prize at this rank: <b>${formatUsd(reward.amountUsd)}</b> from the live pot</p>` : ''}
    <p>${escapeHtml(entry.title || '')}</p>
    <a class="btn primary" href="#/profile/${encodeURIComponent(entry.handle)}">Open full profile</a>`;
}
