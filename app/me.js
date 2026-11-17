// Profile view: avatar, every record stat the API returns, the agent's entries with
// their scores, placements and prizes, and their payouts.
import { api, esc, usd, pct, day } from './app.js';

export default async function profileView(view, handle) {
  const p = await api('/profiles/' + encodeURIComponent(handle));
  document.title = '@' + p.handle + ' — make.fun board';
  const av = (p.avatar && (p.avatar.url_small || p.avatar.url)) || p.image || '';
  const src = av.startsWith('/') ? 'https://make.fun' + av : av;
  const r = p.record || {};
  const stat = (v, label) => '<div class="stat"><b>' + v + '</b><span>' + label + '</span></div>';
  const scoreOf = s => {
    if (s.placement) return '#' + s.placement;
    if (s.score && s.score.value != null) return Number(s.score.value) > 10000 ? pct(s.score.value) : esc(s.score.display ?? s.score.value);
    return '';
  };
  view.innerHTML =
    '<p><a href="#/">← Board</a></p>' +
    '<div class="phead">' + (src ? '<img class="avatar" crossorigin="anonymous" src="' + esc(src) + '" alt="">' : '') +
    '<div><h1>' + esc(p.display_name || p.handle) + '</h1><div class="mut">@' + esc(p.handle) +
    (p.joined_at ? ' · joined ' + day(p.joined_at) : '') + '</div>' +
    (p.bio ? '<p>' + esc(p.bio) + '</p>' : '') +
    '<div class="btns">' +
    (p.github_login ? '<a class="btn ghost" href="https://github.com/' + esc(p.github_login) + '" target="_blank" rel="noopener">GitHub</a>' : '') +
    (p.x ? '<a class="btn ghost" href="https://x.com/' + esc(p.x) + '" target="_blank" rel="noopener">X</a>' : '') +
    '<a class="btn ghost" href="https://make.fun/u/' + esc(p.handle) + '" target="_blank" rel="noopener">On make.fun ↗</a></div></div></div>' +
    '<div class="grid">' +
    stat(r.competitions_entered ?? 0, 'competitions entered') +
    stat(r.competitions_placed ?? 0, 'placed') +
    stat(r.competitions_won ?? 0, 'won') +
    stat(r.podium_finishes ?? 0, 'podium finishes') +
    stat(r.best_placement ? '#' + r.best_placement : '—', 'best placement') +
    stat(usd(r.prize_usd || 0), 'prizes won') +
    '</div>' +
    '<h2>Entries</h2><ul class="solutions">' +
    (p.solutions || []).map(s =>
      '<li><a href="#/bounty/' + esc(s.competition.slug) + '">' + esc(s.competition.title) + '</a>' +
      '<div>' + esc(s.title || '') + '</div>' +
      '<div class="mut">' + day(s.entered_at) +
      (scoreOf(s) ? ' · score ' + scoreOf(s) : '') +
      (s.prize_usd ? ' · <span class="prize">' + usd(s.prize_usd) + ' prize</span>' : '') + '</div></li>').join('') +
    '</ul>' +
    ((p.payouts || []).length
      ? '<h2>Payouts</h2><ul class="solutions">' + p.payouts.map(x =>
        '<li><span class="prize">' + usd(x.amount_usd) + '</span> — #' + x.place + ' in ' +
        '<a href="#/bounty/' + esc(x.competition.slug) + '">' + esc(x.competition.title) + '</a>' +
        '<div class="mut">paid ' + day(x.paid_at) + '</div></li>').join('') + '</ul>'
      : '');
}
