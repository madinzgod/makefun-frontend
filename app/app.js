// make.fun board — master-detail bounty board + bounty pages, on an ETag-revalidating API cache.
// The leaderboard and profile views live in lb.js / me.js and load later by import(), so the
// first load stays a single small shell (see index.html).

const API = 'https://make.fun/api';
const cache = new Map(); // url -> {tag, body, at}
let nReq = 0, nHit = 0;

function bump() {
  const el = document.getElementById('rq');
  if (el) el.textContent = '⚡ ' + nReq + ' requests · ' + nHit + ' cached';
}

// One request per URL per 30 s freshness window; past it, an If-None-Match revalidation
// (the API's ETags turn over each minute, so a 304 is common) reuses the cached body.
export async function api(path) {
  const url = API + path, hit = cache.get(url), now = Date.now();
  if (hit && now - hit.at < 30000) { nHit++; bump(); return hit.body; }
  const r = await fetch(url, { headers: hit ? { 'If-None-Match': hit.tag } : {} });
  nReq++; bump();
  if (r.status === 304 && hit) { hit.at = now; return hit.body; }
  if (!r.ok) throw new Error('api ' + r.status);
  const body = await r.json();
  cache.set(url, { tag: r.headers.get('etag') || '', body, at: now });
  return body;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const usd = n => { n = Number(n || 0); return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
export const pct = micro => (Number(micro || 0) / 10000).toFixed(1) + '%';
export const entriesOf = c => c.submissionCount ?? (c.submissions ? c.submissions.length : 0);
export const isLive = c => new Date(c.deadline).getTime() > Date.now();
export const day = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export function left(ts) {
  let s = Math.floor((new Date(ts).getTime() - Date.now()) / 1000);
  if (s <= 0) return 'ended';
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? d + 'd ' + h + 'h left' : h ? h + 'h ' + m + 'm left' : m + 'm left';
}

const CSS = `
*{box-sizing:border-box}body{margin:0;background:#0a0a10;color:#f4f4f8;font:14px/1.45 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:#ff4d94;text-decoration:none}a:hover{text-decoration:underline}
header{position:sticky;top:0;z-index:9;display:flex;gap:12px;align-items:center;padding:9px 16px;background:rgba(10,10,16,.94);border-bottom:1px solid #232333}
.logo{font-weight:800;font-size:17px;color:#f4f4f8}.logo b{color:#ff4d94}.logo span{color:#9b9bb0;font-weight:600;font-size:12px}
.rq{font-size:12px;color:#9b9bb0;border:1px solid #232333;border-radius:99px;padding:3px 9px;white-space:nowrap}
.sp{flex:1}#pf{display:flex;gap:6px}#pf input{width:150px}
input,select,button{background:#171724;color:#f4f4f8;border:1px solid #2c2c40;border-radius:9px;padding:7px 10px;font:inherit;font-size:13px}
button{cursor:pointer}button:hover{border-color:#ff4d94}
main{max-width:1240px;margin:0 auto;padding:16px}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.tabs{display:flex;border:1px solid #2c2c40;border-radius:9px;overflow:hidden}
.tabs button{border:0;border-radius:0;background:#12121b}.tabs button.on{background:#ff4d94;color:#fff;font-weight:700}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.chip{border-radius:99px;padding:4px 11px;font-size:12px;background:#12121b}.chip.on{background:#2a2a3d;border-color:#ff4d94;color:#fff}
.wrap{display:grid;grid-template-columns:385px 1fr;gap:14px;align-items:start}
#list{display:flex;flex-direction:column;gap:9px}
.card{background:#12121b;border:1px solid #232333;border-radius:12px;padding:11px 13px;cursor:pointer}
.card:hover{border-color:#3a3a55}.card.sel{border-color:#ff4d94;box-shadow:0 0 0 1px #ff4d94}
.card h3{margin:0 0 5px;font-size:14.5px;line-height:1.3}
.ct{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.meta{display:flex;gap:11px;flex-wrap:wrap;color:#9b9bb0;font-size:12.5px}.meta .pot{color:#fff;font-weight:800;font-size:15px}
.pill{font-size:11px;font-weight:700;border-radius:99px;padding:2px 8px;white-space:nowrap}
.pill.on{background:rgba(47,191,113,.16);color:#2fbf71}.pill.off{background:rgba(155,155,176,.14);color:#9b9bb0}
.cat{color:#b04dff;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
aside#detail,.panel{background:#12121b;border:1px solid #232333;border-radius:14px;padding:18px}
aside#detail{position:sticky;top:58px}
.big{font-size:31px;font-weight:800}.big small{font-size:13px;color:#9b9bb0;font-weight:600}
.stats{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0;color:#9b9bb0;font-size:13px}.stats b{color:#fff;display:block;font-size:15px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #1d1d2b}th{color:#9b9bb0;font-weight:600}
.desc{white-space:pre-wrap;color:#cfcfdd;font-size:13.5px;max-height:300px;overflow:auto}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.btn{background:#ff4d94;color:#fff;border-radius:9px;padding:8px 13px;font-weight:700}.btn.ghost{background:#171724;color:#f4f4f8;border:1px solid #2c2c40}
h1{font-size:24px;margin:2px 0 8px}h2{font-size:19px;margin:2px 0 8px}
.lbwrap{overflow:auto;max-height:calc(100vh - 215px);border:1px solid #232333;border-radius:12px;background:#12121b}
.lbwrap thead th{position:sticky;top:0;background:#171724;z-index:2}
.lbwrap td,.lbwrap th{white-space:nowrap}.lbwrap td.t{white-space:normal;min-width:220px}
tr.me td{background:rgba(255,77,148,.08)}
.prize{color:#2fbf71;font-weight:700}
.phead{display:flex;gap:16px;align-items:center}.avatar{width:72px;height:72px;border-radius:50%;border:2px solid #ff4d94;object-fit:cover}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin:14px 0}
.stat{background:#12121b;border:1px solid #232333;border-radius:12px;padding:11px}.stat b{font-size:19px;display:block}.stat span{color:#9b9bb0;font-size:12px}
.solutions{list-style:none;padding:0;margin:0}.solutions li{background:#12121b;border:1px solid #232333;border-radius:12px;padding:11px 13px;margin-bottom:9px}
.err{color:#ff8080}.mut{color:#9b9bb0}
@media(max-width:880px){.wrap{grid-template-columns:1fr}aside#detail{position:static}#pf input{width:105px}.big{font-size:25px}}
`;
document.head.insertAdjacentHTML('beforeend', '<style>' + CSS + '</style>');

// ---------- shell ----------
document.getElementById('app').innerHTML =
  '<header><a class="logo" href="#/">make<b>.fun</b> <span>LIVE BOARD</span></a>' +
  '<span class="rq" id="rq">⚡ 0 requests</span><span class="sp"></span>' +
  '<form id="pf"><input id="ph" placeholder="Profile @handle" autocomplete="off"><button>View</button></form>' +
  '<button id="rf2" title="Refresh">↻</button></header><main id="view"></main>';
document.getElementById('pf').addEventListener('submit', e => {
  e.preventDefault();
  const h = document.getElementById('ph').value.trim().replace(/^@/, '');
  if (h) location.hash = '#/profile/' + encodeURIComponent(h);
});
document.getElementById('rf2').addEventListener('click', () => route());

// ---------- board (master-detail) ----------
let comps = [], tab = 'live', sortBy = 'pot', query = '', chip = 'All', sel = null;
const cardBy = new Map();

function buildCard(c) {
  const el = document.createElement('article');
  el.className = 'card'; el.dataset.slug = c.slug;
  el.innerHTML = '<div class="ct"><h3></h3><span class="pill"></span></div>' +
    '<div class="meta"><span class="pot"></span><span class="fee"></span><span class="ent"></span><span class="tl" data-dl></span></div>' +
    '<span class="cat"></span>';
  el.addEventListener('click', () => { sel = c.slug; paintList(); paintDetail(); });
  patchCard(el, c);
  return el;
}
function patchCard(el, c) {
  const live = isLive(c);
  el.querySelector('h3').textContent = c.title;
  const pill = el.querySelector('.pill');
  pill.className = 'pill ' + (live ? 'on' : 'off'); pill.textContent = live ? '● Live' : 'Ended';
  el.querySelector('.pot').textContent = usd(c.potUsd);
  el.querySelector('.fee').textContent = Number(c.entryFeeUsd) > 0 ? 'fee ' + usd(c.entryFeeUsd) : 'free entry';
  el.querySelector('.ent').textContent = entriesOf(c) + ' entries';
  const tl = el.querySelector('.tl'); tl.dataset.dl = c.deadline; tl.textContent = '⏳ ' + left(c.deadline);
  el.querySelector('.cat').textContent = c.category || '';
}
function visible() {
  let out = comps.filter(c => (tab === 'live') === isLive(c));
  if (chip !== 'All') out = out.filter(c => c.category === chip);
  if (query) { const q = query.toLowerCase(); out = out.filter(c => (c.title + ' ' + c.slug).toLowerCase().includes(q)); }
  const by = { pot: (a, b) => b.potUsd - a.potUsd, end: (a, b) => new Date(a.deadline) - new Date(b.deadline), entries: (a, b) => entriesOf(b) - entriesOf(a) };
  return out.sort(by[sortBy]);
}
function paintList() {
  const list = document.getElementById('list'); if (!list) return;
  const vis = visible(), seen = new Set();
  for (const c of vis) {
    seen.add(c.slug);
    let el = cardBy.get(c.slug);
    if (!el) { el = buildCard(c); cardBy.set(c.slug, el); } else patchCard(el, c);
    el.classList.toggle('sel', c.slug === sel);
    list.appendChild(el); // re-appending moves the node: order updates without rebuilding it
  }
  for (const [slug, el] of cardBy) if (!seen.has(slug)) el.style.display = 'none';
  for (const c of vis) cardBy.get(c.slug).style.display = '';
  document.getElementById('nl').textContent = comps.filter(isLive).length;
  document.getElementById('ne').textContent = comps.filter(c => !isLive(c)).length;
}
function rewardsHtml(c, limit) {
  const all = c.rewardsNow || [];
  const rows = all.slice(0, limit || all.length).map(r => '<tr><td>#' + r.place + '</td><td class="prize">' + usd(r.amountUsd) + '</td></tr>').join('');
  if (!rows) return '';
  return '<table><tr><th>Place</th><th>Reward (live pot)</th></tr>' + rows + '</table>' +
    (limit && all.length > limit ? '<p class="mut">+ ' + (all.length - limit) + ' more places on the bounty page</p>' : '');
}
function detailHtml(c) {
  const live = isLive(c);
  return '<span class="cat">' + esc(c.category || '') + '</span>' +
    '<h2>' + esc(c.title) + '</h2>' +
    '<div class="big">' + usd(c.potUsd) + ' <small>live pot · ' + (live ? '⏳ ' + left(c.deadline) : 'ended ' + day(c.deadline)) + '</small></div>' +
    '<div class="stats"><span><b>' + usd(c.entryFeeUsd || 0) + '</b>entry fee</span><span><b>' + entriesOf(c) + '</b>entries</span>' +
    '<span><b>' + day(c.deadline) + '</b>deadline</span><span><b>' + esc(c.status || '') + '</b>status</span></div>' +
    '<div class="btns"><a class="btn" href="#/bounty/' + c.slug + '">Bounty page</a>' +
    '<a class="btn ghost" href="#/leaderboard/' + c.slug + '">Leaderboard</a>' +
    '<a class="btn ghost" href="https://make.fun/bounty/' + c.slug + '" target="_blank" rel="noopener">On make.fun ↗</a></div>' +
    (c.summary ? '<p>' + esc(c.summary) + '</p>' : '') + rewardsHtml(c, 10) +
    '<h3>Top entries</h3><div id="top5" class="mut">Loading…</div>';
}
async function paintDetail() {
  const pane = document.getElementById('detail'); if (!pane) return;
  const c = comps.find(x => x.slug === sel) || visible()[0];
  if (!c) { pane.innerHTML = '<p class="mut">No bounties match.</p>'; return; }
  sel = c.slug;
  pane.innerHTML = detailHtml(c);
  try {
    const lb = await api('/competitions/' + c.slug + '/leaderboard');
    if (sel !== c.slug) return;
    const top = (lb.entries || []).slice(0, 5);
    document.getElementById('top5').innerHTML = top.length
      ? top.map(e => '<div>' + e.rank + '. <a href="#/profile/' + esc(e.handle) + '">@' + esc(e.handle) + '</a> — ' + pct(e.values && e.values.judge) + '</div>').join('')
      : '<span class="mut">No ranked entries yet.</span>';
  } catch { const t = document.getElementById('top5'); if (t) t.textContent = 'Leaderboard not available yet.'; }
}
async function boardView(view) {
  view.innerHTML =
    '<div class="bar"><div class="tabs"><button data-t="live" class="' + (tab === 'live' ? 'on' : '') + '">Live <span id="nl"></span></button>' +
    '<button data-t="ended" class="' + (tab === 'ended' ? 'on' : '') + '">Ended <span id="ne"></span></button></div>' +
    '<input id="q" type="search" placeholder="Search bounties…" value="' + esc(query) + '">' +
    '<select id="so"><option value="pot">Biggest pot</option><option value="end">Ending soon</option><option value="entries">Most entries</option></select>' +
    '<span class="mut" id="cnt"></span></div><div class="chips" id="chips"></div>' +
    '<div class="wrap"><section id="list"></section><aside id="detail"></aside></div>';
  document.getElementById('so').value = sortBy;
  view.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.t;
    view.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    paintList(); paintDetail();
  }));
  document.getElementById('q').addEventListener('input', e => { query = e.target.value; paintList(); });
  document.getElementById('so').addEventListener('change', e => { sortBy = e.target.value; paintList(); });
  const data = await api('/competitions');
  comps = data.items || [];
  const cats = ['All', ...new Set(comps.map(c => c.category).filter(Boolean))];
  document.getElementById('chips').innerHTML = cats.map(k => '<button class="chip' + (k === chip ? ' on' : '') + '" data-k="' + esc(k) + '">' + esc(k) + '</button>').join('');
  view.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    chip = b.dataset.k;
    view.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    paintList(); paintDetail();
  }));
  if (!comps.some(c => c.slug === sel)) sel = null;
  paintList();
  document.getElementById('cnt').textContent = comps.length + ' bounties';
  await paintDetail();
}

// ---------- bounty page ----------
async function bountyView(view, slug) {
  const c = await api('/competitions/' + slug);
  document.title = c.title + ' — make.fun board';
  const live = isLive(c);
  view.innerHTML = '<p><a href="#/">← All bounties</a></p><div class="panel">' +
    '<span class="cat">' + esc(c.category || '') + '</span> <span class="pill ' + (live ? 'on' : 'off') + '">' + (live ? '● Live' : 'Ended') + '</span>' +
    '<h1>' + esc(c.title) + '</h1>' +
    '<div class="big">' + usd(c.potUsd) + ' <small>live pot</small></div>' +
    '<div class="stats"><span><b>' + usd(c.entryFeeUsd || 0) + '</b>entry fee</span><span><b>' + entriesOf(c) + '</b>entries</span>' +
    '<span><b>' + day(c.publishedAt) + '</b>published</span><span><b>' + day(c.deadline) + '</b>deadline</span>' +
    '<span><b data-dl="' + c.deadline + '">' + left(c.deadline) + '</b>time left</span><span><b>' + esc(c.status || '') + '</b>status</span></div>' +
    '<div class="btns"><a class="btn" href="#/leaderboard/' + c.slug + '">Leaderboard</a>' +
    '<a class="btn ghost" href="https://make.fun/bounty/' + c.slug + '" target="_blank" rel="noopener">Enter on make.fun ↗</a></div>' +
    '<h3>Rewards</h3>' + rewardsHtml(c) +
    (c.summary ? '<h3>Summary</h3><p>' + esc(c.summary) + '</p>' : '') +
    (c.description ? '<h3>About &amp; rules</h3><div class="desc">' + esc(c.description) + '</div>' : '') +
    '</div>';
}

// ---------- router ----------
async function route() {
  window.__shotReady = false;
  const view = document.getElementById('view');
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (!parts.length) { document.title = 'make.fun — live bounty board'; await boardView(view); }
    else if (parts[0] === 'bounty' && parts[2] === 'leaderboard') (await import('./lb.js')).default(view, parts[1]);
    else if (parts[0] === 'bounty') await bountyView(view, parts[1]);
    else if (parts[0] === 'leaderboard') (await import('./lb.js')).default(view, parts[1]);
    else if (parts[0] === 'profile' || parts[0] === 'u') (await import('./me.js')).default(view, decodeURIComponent(parts[1] || ''));
    else { document.title = 'make.fun — live bounty board'; await boardView(view); }
  } catch (e) {
    view.innerHTML = '<p class="err">Could not load this view (' + esc(e.message) + '). <a href="#/">Back to the board</a></p>';
  }
  window.__shotReady = true;
}
window.addEventListener('hashchange', route);
route();

// Countdowns tick without any network request; board data revalidates (ETag) once a minute.
setInterval(() => document.querySelectorAll('[data-dl]').forEach(el => { el.textContent = '⏳ ' + left(el.dataset.dl); }), 30000);
setInterval(() => { if (!document.hidden && !location.hash.replace(/^#\/?/, '')) route(); }, 60000);
