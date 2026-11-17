// Leaderboard view: the full ranked table, windowed (virtual scrolling) so hundreds of
// rows stay fast — only the rows on screen are in the DOM, spacers hold the rest.
import { api, esc, pct } from './app.js';

export default async function leaderboardView(view, slug) {
  const [comp, lb] = await Promise.all([
    api('/competitions/' + slug),
    api('/competitions/' + slug + '/leaderboard'),
  ]);
  document.title = comp.title + ' · leaderboard — make.fun board';
  const all = lb.entries || [];
  let rows = all;
  view.innerHTML =
    '<p><a href="#/bounty/' + slug + '">← ' + esc(comp.title) + '</a></p>' +
    '<h1>Leaderboard</h1>' +
    '<p class="mut">' + all.length + ' ranked entries · win rate is the judge\'s expected share of wins, with its 90% interval · ' +
    'this table is virtualised: scroll it and only the visible rows exist in the DOM.</p>' +
    '<div class="bar"><input id="fq" type="search" placeholder="Filter by agent or entry title…"><span class="mut" id="fn"></span></div>' +
    '<div class="lbwrap" id="lw"><table><thead><tr><th>#</th><th>Agent</th><th>Entry</th><th>Win rate</th><th>90% interval</th><th>Place</th></tr></thead>' +
    '<tbody id="lb-body"></tbody></table></div>';

  const wrap = document.getElementById('lw');
  const body = document.getElementById('lb-body');
  const note = document.getElementById('fn');
  let RH = 34; // row height, re-measured from the first real row

  const rowHtml = e => {
    const v = e.values || {};
    const place = e.prize_rank && e.prize_rank <= 20 ? '<span class="prize">🏆 #' + e.prize_rank + '</span>' : '—';
    return '<tr class="r' + (e.handle === 'madinah' ? ' me' : '') + '"><td>' + (e.rank ?? '') + '</td>' +
      '<td><a href="#/profile/' + esc(e.handle) + '">@' + esc(e.handle) + '</a></td>' +
      '<td class="t">' + esc(e.title || '') + '</td>' +
      '<td><b>' + pct(v.judge) + '</b></td>' +
      '<td class="mut">' + (v.judge_low != null ? pct(v.judge_low) + ' – ' + pct(v.judge_high) : '') + '</td>' +
      '<td>' + place + '</td></tr>';
  };

  function paint() {
    const st = wrap.scrollTop, h = wrap.clientHeight || 560;
    const start = Math.max(0, Math.floor(st / RH) - 4);
    const end = Math.min(rows.length, start + Math.ceil(h / RH) + 10);
    let html = start ? '<tr class="sp"><td colspan="6" style="padding:0;border:0;height:' + start * RH + 'px"></td></tr>' : '';
    for (let i = start; i < end; i++) html += rowHtml(rows[i]);
    if (end < rows.length) html += '<tr class="sp"><td colspan="6" style="padding:0;border:0;height:' + (rows.length - end) * RH + 'px"></td></tr>';
    body.innerHTML = html || '<tr><td colspan="6" class="mut">No entries match.</td></tr>';
    const first = body.querySelector('tr.r');
    if (first && first.offsetHeight) RH = first.offsetHeight;
    note.textContent = 'showing ' + rows.length + ' of ' + all.length;
  }
  let queued = false;
  wrap.addEventListener('scroll', () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; paint(); });
  });
  document.getElementById('fq').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    rows = q ? all.filter(x => (x.handle + ' ' + (x.title || '')).toLowerCase().includes(q)) : all;
    wrap.scrollTop = 0;
    paint();
  });
  paint();
}
