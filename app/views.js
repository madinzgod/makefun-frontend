// One render function per surface. Each returns the HTML for <main> and,
// when the surface needs wiring once it lands, a mount function. All data
// comes through api.js, so surfaces share its ETag cache.

import { competitions, competition, leaderboard, profile } from './api.js';
import { usd, pct, count, day, timeLeft, esc } from './format.js';

// A bounty takes entries until its deadline, whatever its status says.
const open = (c) => Date.parse(c.deadline) > Date.now();

// ---- the board: every live bounty with its pot, fee, time left, entries

function card(c) {
  const fee = c.entryFeeUsd != null && Number(c.entryFeeUsd) > 0
    ? '<span>Fee ' + usd(c.entryFeeUsd) + '</span>'
    : '<span>Free entry</span>';
  const pill = open(c)
    ? '<span class="pill on">Open</span>'
    : '<span class="pill off">Closed</span>';
  return '<article class="card">'
    + '<div class="card-top"><span class="cat">' + esc(c.category || 'Bounty') + ' ' + pill + '</span>'
    + '<span class="pot">' + usd(c.potUsd ?? c.rewardAmount) + '</span></div>'
    + '<h2><a href="#/bounty/' + esc(c.slug) + '">' + esc(c.title) + '</a></h2>'
    + (c.summary ? '<p class="sum">' + esc(c.summary) + '</p>' : '')
    + '<div class="meta"><span>' + count(c.submissionCount) + ' entries</span>' + fee
    + '<span>' + timeLeft(c.deadline) + '</span></div>'
    + '<div class="card-links"><a href="#/bounty/' + esc(c.slug) + '">Details</a>'
    + '<a href="#/leaderboard/' + esc(c.slug) + '">Leaderboard</a></div></article>';
}

export async function boardView() {
  const data = await competitions();
  const items = (data.items || []).slice();
  items.sort((a, b) => (open(b) - open(a)) || (open(a)
    ? Date.parse(a.deadline) - Date.parse(b.deadline)
    : Date.parse(b.deadline) - Date.parse(a.deadline)));
  const live = items.filter(open).length;
  const html = '<div class="head"><h1>Live bounties</h1><p>' + items.length
    + ' competitions · ' + live + ' still taking entries</p></div>'
    + '<div class="grid">' + items.map(card).join('') + '</div>';
  return { html };
}

// ---- a bounty's page: summary, live pot, rewards table, dates, rules

function rewardsTable(rows) {
  if (!rows || !rows.length) return '';
  const body = rows.map((r) => '<tr><td>#' + r.place + '</td><td>' + usd(r.amountUsd)
    + '</td><td class="dim">' + usd(r.baseUsd) + ' base + ' + usd(r.feeShareUsd)
    + ' fee share</td></tr>').join('');
  return '<h2>Rewards</h2><table class="tbl"><thead><tr><th>Place</th><th>Prize</th>'
    + '<th>How it is made up</th></tr></thead><tbody>' + body + '</tbody></table>';
}

function stat(value, label) {
  return '<div class="stat"><b>' + value + '</b><span>' + label + '</span></div>';
}

export async function bountyView(slug) {
  const c = await competition(slug);
  const status = open(c)
    ? 'Open · ' + timeLeft(c.deadline)
    : 'Closed · ended ' + day(c.deadline);
  let rules = '';
  if (typeof c.rules === 'string' && c.rules.trim()) {
    rules = '<h2>Rules</h2><div class="prose">' + esc(c.rules) + '</div>';
  } else if (Array.isArray(c.rules) && c.rules.length) {
    rules = '<h2>Rules</h2><ul>' + c.rules.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>';
  }
  const html = '<p class="crumb"><a href="#/">← Board</a></p>'
    + '<div class="head"><span class="cat">' + esc(c.category || 'Bounty') + '</span>'
    + '<h1>' + esc(c.title) + '</h1>'
    + (c.summary ? '<p class="lede">' + esc(c.summary) + '</p>' : '') + '</div>'
    + '<div class="stats">'
    + stat(usd(c.potUsd ?? c.rewardAmount), 'Live pot')
    + stat(count(c.submissionCount), 'Entries')
    + stat(c.entryFeeUsd != null ? usd(c.entryFeeUsd) : 'Free', 'Entry fee')
    + stat(day(c.deadline), 'Deadline') + '</div>'
    + '<p class="status">' + status + ' · opened ' + day(c.opensAt) + '</p>'
    + '<p><a class="btn" href="#/leaderboard/' + esc(c.slug) + '">View the leaderboard</a></p>'
    + rewardsTable(c.rewardsNow)
    + (c.description ? '<h2>About</h2><div class="prose">' + esc(c.description) + '</div>' : '')
    + rules;
  return { html };
}

// ---- a bounty's leaderboard: ranked entries with their win rates

let lbRows = [];
const LB_PAGE = 50;

function lbRow(e) {
  const tag = e.house ? ' <span class="tag">house</span>'
    : e.baseline ? ' <span class="tag">baseline</span>' : '';
  return '<tr><td>' + (e.rank ?? '') + '</td>'
    + '<td><a href="#/profile/' + esc(e.handle) + '">@' + esc(e.handle) + '</a>' + tag + '</td>'
    + '<td>' + esc(e.title || '') + '</td>'
    + '<td class="num">' + pct(e.values && e.values.judge) + '</td></tr>';
}

export async function leaderboardView(slug) {
  const [comp, data] = await Promise.all([competition(slug), leaderboard(slug)]);
  lbRows = (data.entries || []).slice(0, 100);
  const first = lbRows.slice(0, LB_PAGE);
  const more = lbRows.length > first.length
    ? '<p><button type="button" data-show-all>Show all ' + lbRows.length + ' entries</button></p>'
    : '';
  const html = '<p class="crumb"><a href="#/bounty/' + esc(slug) + '">← '
    + esc(comp.title || slug) + '</a></p>'
    + '<div class="head"><h1>Leaderboard</h1><p>' + esc(comp.title || '')
    + ' · win rate against the whole field, best first</p></div>'
    + '<table class="tbl"><thead><tr><th>Rank</th><th>Entrant</th><th>Entry</th>'
    + '<th class="num">Win rate</th></tr></thead>'
    + '<tbody id="lb-body">' + first.map(lbRow).join('') + '</tbody></table>'
    + more;
  const mount = (root) => {
    const btn = root.querySelector('[data-show-all]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      root.querySelector('#lb-body').innerHTML = lbRows.map(lbRow).join('');
      btn.remove();
    });
  };
  return { html, mount };
}

// ---- an account's public profile: avatar, record and their entries

export async function profileView(handle) {
  const p = await profile(handle);
  const av = p.avatar && (p.avatar.url_small || p.avatar.url)
    ? (p.avatar.url_small || p.avatar.url)
    : (typeof p.image === 'string' ? p.image : null);
  const avatar = av
    ? '<img class="avatar" crossorigin="anonymous" src="' + esc(av) + '" alt="">'
    : '<span class="avatar avatar-none">' + esc((p.handle || '?').slice(0, 1).toUpperCase()) + '</span>';
  const rec = p.record || {};
  const stats = stat(count(rec.competitions_entered), 'Entered')
    + stat(count(rec.competitions_placed), 'Placed')
    + stat(count(rec.competitions_won), 'Won')
    + stat(count(rec.podium_finishes), 'Podiums')
    + stat(rec.best_placement != null ? '#' + rec.best_placement : '–', 'Best place')
    + stat(usd(rec.prize_usd), 'Prizes won');
  const solutions = (p.solutions || []).map((s) => {
    const comp = s.competition || {};
    const bits = [];
    if (s.placement != null) bits.push('placed #' + s.placement);
    if (s.prize_usd != null && Number(s.prize_usd) > 0) bits.push(usd(s.prize_usd));
    if (s.score && s.score.display) {
      bits.push(esc((s.score.column ? s.score.column.title + ': ' : '') + s.score.display));
    }
    return '<li><a href="#/bounty/' + esc(comp.slug || '') + '">' + esc(s.title || 'Entry') + '</a>'
      + '<span class="dim"> in ' + esc(comp.title || '')
      + (bits.length ? ' · ' + bits.join(' · ') : '') + '</span></li>';
  }).join('');
  const links = [];
  if (p.github_login) {
    links.push('<a href="https://github.com/' + esc(p.github_login) + '">GitHub @'
      + esc(p.github_login) + '</a>');
  }
  if (p.wallet && p.wallet.address) {
    links.push('<span class="dim">Wallet ' + esc(p.wallet.address) + '</span>');
  }
  const html = '<div class="profile-head">' + avatar + '<div>'
    + '<h1>' + esc(p.display_name || p.handle) + '</h1>'
    + '<p class="dim">@' + esc(p.handle) + ' · joined ' + day(p.joined_at) + '</p>'
    + (p.bio ? '<p>' + esc(p.bio) + '</p>' : '')
    + (links.length ? '<p>' + links.join(' · ') + '</p>' : '')
    + '</div></div>'
    + '<div class="stats">' + stats + '</div>'
    + '<h2>Entries</h2>'
    + (solutions ? '<ul class="solutions">' + solutions + '</ul>'
      : '<p class="dim">No entries yet.</p>');
  return { html };
}
