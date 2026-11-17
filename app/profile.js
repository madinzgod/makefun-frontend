// An account's public profile: its record as stat cards and every entry
// it has made, grouped by the bounty it was entered in.

import {
  apiProfile, absolutize, escapeHtml, formatDate, formatUsd, formatWinRate,
  paintRequestsPanel, requestsPanelHtml,
} from './api.js';

export function routeProfile(root, handle) {
  root.innerHTML = `
    <div class="view-head"><a class="back-link" href="#/">← All bounties</a>${requestsPanelHtml()}</div>
    <div id="profile-body"><p class="sub">Loading profile…</p></div>`;
  const panel = root.querySelector('.requests-panel');
  const body = root.querySelector('#profile-body');

  const render = (p) => {
    const avatar = p.avatar ? absolutize(p.avatar.url_small || p.avatar.url) : '';
    const groups = groupEntriesByBounty(p.solutions);
    const groupHtml = [...groups.values()].map(({ competition: c, entries }) => `
      <section class="group-card">
        <h3><a href="#/bounty/${encodeURIComponent(c.slug || '')}">${escapeHtml(c.title || c.slug || '')}</a></h3>
        <p class="sub">${escapeHtml(c.category || '')} · ${escapeHtml(c.status || '')} · pot ${formatUsd(c.pot_usd)}
          · <a href="#/leaderboard/${encodeURIComponent(c.slug || '')}">Leaderboard</a></p>
        <ul class="solutions">${entries.map(solutionRow).join('')}</ul>
      </section>`).join('');
    body.innerHTML = `
      <div class="profile-head">
        ${avatar
          ? `<img class="avatar" crossorigin="anonymous" src="${escapeHtml(avatar)}" alt="">`
          : `<span class="avatar-initial">${escapeHtml((p.handle || '?').charAt(0).toUpperCase())}</span>`}
        <div>
          <h1>@${escapeHtml(p.handle)}</h1>
          <div class="sub">${escapeHtml(p.display_name || '')} joined ${formatDate(p.joined_at)}</div>
          <div class="actions">
            <a class="btn" href="https://make.fun/u/${encodeURIComponent(p.handle)}" target="_blank" rel="noopener">Enter on make.fun</a>
            ${p.github_login ? `<a class="btn" href="https://github.com/${encodeURIComponent(p.github_login)}" target="_blank" rel="noopener">GitHub</a>` : ''}
          </div>
        </div>
      </div>
      ${p.bio ? `<p>${escapeHtml(p.bio)}</p>` : ''}
      <div class="stat-grid">${profileStatCards(p.record)}</div>
      <h2>Entries by bounty</h2>
      <div class="groups">${groupHtml || '<p class="sub">No entries yet.</p>'}</div>`;
    paintRequestsPanel(panel);
    window.__shotReady = true;
  };

  const load = (force) => loadProfile(handle, { force }).then(render);
  panel.querySelector('.rp-refresh').addEventListener('click', () => load(true).catch(() => {}));
  load(false).catch((err) => {
    body.innerHTML = /404/.test(err.message)
      ? `<div class="error-box"><h1 class="page">Profile not found</h1><p>No account named @${escapeHtml(handle)} exists on make.fun. <a href="#/">Back to the board</a></p></div>`
      : `<div class="error-box">Could not load this profile: ${escapeHtml(err.message)}</div>`;
    window.__shotReady = true;
  });
  return () => {};
}

export function loadProfile(handle, options) {
  return apiProfile(handle, options);
}

export function profileStatCards(record) {
  const r = record || {};
  const cards = [
    [formatUsd(r.prize_usd), 'prizes won'],
    [r.competitions_entered ?? '—', 'entered'],
    [r.competitions_placed ?? '—', 'placed'],
    [r.competitions_won ?? '—', 'won'],
    [r.best_placement ? `#${r.best_placement}` : '—', 'best place'],
    [r.podium_finishes ?? '—', 'podiums'],
  ];
  return cards.map(([value, label]) =>
    `<div class="stat"><b>${escapeHtml(value)}</b><span>${label}</span></div>`).join('');
}

export function groupEntriesByBounty(solutions) {
  const groups = new Map();
  for (const s of solutions || []) {
    const slug = s.competition ? s.competition.slug : 'unknown';
    if (!groups.has(slug)) groups.set(slug, { competition: s.competition || {}, entries: [] });
    groups.get(slug).entries.push(s);
  }
  return groups;
}

function solutionRow(s) {
  const place = s.placement ? `<span class="place-badge">#${s.placement}</span>` : '<span class="sub">unplaced</span>';
  const prize = s.prize_usd ? formatUsd(s.prize_usd) : '—';
  const score = s.score && s.score.value !== null && s.score.value !== undefined
    ? (s.score.column && s.score.column.key === 'elo'
      ? `Elo ${s.score.value}`
      : `${formatWinRate(s.score.value)} win rate`)
    : '';
  return `<li><b>${escapeHtml(s.title || '')}</b><br>
    ${place} · prize ${prize}${score ? ` · ${score}` : ''}<br>
    <span class="sub">entered ${formatDate(s.entered_at)}</span></li>`;
}
