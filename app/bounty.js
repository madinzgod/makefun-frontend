// One bounty's page: stats, the full rewards table paid from the live pot,
// its dates and phases, its description and rules.

import {
  apiCompetition, escapeHtml, formatCount, formatDate, formatDateTime,
  formatTimeLeft, formatUsd, isLiveByDeadline, paintRequestsPanel, requestsPanelHtml,
} from './util.js';

export function routeBounty(root, slug) {
  root.innerHTML = `
    <div class="view-head"><a class="back-link" href="#/">← All bounties</a>${requestsPanelHtml()}</div>
    <div id="bounty-body"><p class="sub">Loading bounty…</p></div>`;
  const panel = root.querySelector('.requests-panel');
  const body = root.querySelector('#bounty-body');
  let detail = null;

  const render = () => {
    const now = Date.now();
    const live = isLiveByDeadline(detail, now);
    body.innerHTML = `
      <div class="cat">${escapeHtml(detail.category || '')}
        <span class="pill ${live ? 'live' : 'done'}">${live ? 'Live · open' : 'Ended · closed'}</span></div>
      <h1 class="page">${escapeHtml(detail.title)}</h1>
      <div class="stat-grid">
        <div class="stat"><b>${formatUsd(detail.potUsd)}</b><span>live pot</span></div>
        <div class="stat"><b>${Number(detail.entryFeeUsd) > 0 ? formatUsd(detail.entryFeeUsd) : 'free'}</b><span>entry fee</span></div>
        <div class="stat"><b>${formatCount(detail.submissionCount)}</b><span>entries</span></div>
        <div class="stat"><b>${formatDate(detail.publishedAt)}</b><span>published</span></div>
        <div class="stat"><b>${formatDate(detail.deadline)}</b><span>deadline</span></div>
        <div class="stat"><b data-tl data-deadline="${escapeHtml(detail.deadline || '')}">${formatTimeLeft(detail.deadline, now)}</b><span>time left</span></div>
      </div>
      <div class="actions">
        <a class="btn primary" href="#/leaderboard/${encodeURIComponent(slug)}">Leaderboard</a>
        <a class="btn" href="https://make.fun/bounty/${encodeURIComponent(slug)}" target="_blank" rel="noopener">Enter on make.fun</a>
      </div>
      <div class="detail-grid">
        <section class="panel-card"><h2>Rewards — paid from the live pot</h2>
          ${rewardsTableWithBars(detail.rewardsNow)}</section>
        <section class="panel-card"><h2>Dates and phases</h2>
          ${datesAndPhasesPanel(detail)}</section>
      </div>
      <section class="panel-card"><h2>About this bounty</h2>
        <p>${escapeHtml(detail.summary || '')}</p>
        <div class="prose">${escapeHtml(detail.description || '')}</div></section>
      ${detail.rules ? `<section class="panel-card"><h2>Rules</h2><div class="prose">${escapeHtml(detail.rules)}</div></section>` : ''}`;
    paintRequestsPanel(panel);
    window.__shotReady = true;
  };

  const load = async (force) => {
    detail = await apiCompetition(slug, { force });
    render();
  };
  panel.querySelector('.rp-refresh').addEventListener('click', () => load(true).catch(() => {}));
  const ticker = setInterval(() => {
    const now = Date.now();
    for (const el of root.querySelectorAll('[data-tl]')) {
      el.textContent = formatTimeLeft(el.dataset.deadline, now);
    }
    paintRequestsPanel(panel);
  }, 1000);

  load(false).catch((err) => {
    body.innerHTML = /404/.test(err.message)
      ? `<div class="error-box"><h1 class="page">Bounty not found</h1><p>No bounty named “${escapeHtml(slug)}” exists on make.fun. <a href="#/">Back to the board</a></p></div>`
      : `<div class="error-box">Could not load this bounty: ${escapeHtml(err.message)}</div>`;
    window.__shotReady = true;
  });
  return () => clearInterval(ticker);
}

export function rewardsTableWithBars(rewards) {
  const rows = rewards || [];
  const top = Math.max(...rows.map((r) => Number(r.amountUsd) || 0), 0);
  const body = rows.map((r) => {
    const amount = Number(r.amountUsd) || 0;
    const width = top > 0 ? Math.max(2, Math.round((amount / top) * 100)) : 0;
    return `<tr>
      <td>#${r.place}</td><td>${formatUsd(r.baseUsd)}</td><td>${formatUsd(r.feeShareUsd)}</td>
      <td class="amt">${formatUsd(r.amountUsd)}</td>
      <td><div class="bar"><i style="width:${width}%"></i></div></td></tr>`;
  }).join('');
  return `<table class="rewards"><thead><tr>
    <th>Place</th><th>Base</th><th>Fee share</th><th>Pays now</th><th></th>
    </tr></thead><tbody>${body}</tbody></table>`;
}

export function datesAndPhasesPanel(detail) {
  const now = Date.now();
  let nowMarked = false;
  const phases = (detail.phases || []).map((p) => {
    const start = new Date(p.startsAt).getTime();
    const end = new Date(p.endsAt).getTime();
    const current = !nowMarked && now >= start && now < end;
    if (current) nowMarked = true;
    const marker = current
      ? ' <span class="now-marker">Now</span>'
      : now >= end ? ' <span class="sub">done</span>' : ' <span class="sub">upcoming</span>';
    return `<div class="phase"><div><b>${escapeHtml(p.title)}</b>${marker}<br>
      <span class="sub">${escapeHtml(p.key)} phase</span></div>
      <div class="when">${formatDateTime(p.startsAt)}<br>→ ${formatDateTime(p.endsAt)}</div></div>`;
  }).join('');
  return `<div class="phases-panel">
    <div class="phase"><div><b>Published</b></div><div class="when">${formatDateTime(detail.publishedAt)}</div></div>
    <div class="phase"><div><b>Entries close</b></div>
      <div class="when">${formatDateTime(detail.deadline)}</div></div>
    ${phases}</div>`;
}
