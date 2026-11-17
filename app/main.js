// Hash router and boot. Every surface has its own URL and is linked from
// the others: #/ the board, #/bounty/<slug> a bounty, #/leaderboard/<slug>
// its leaderboard, #/profile/<handle> an account (the #/u/<handle> spelling
// and #/bounty/<slug>/leaderboard work too). window.__shotReady is false
// while a route loads and true once its data is on screen, so screenshot
// tooling can tell when a page is done.

import { boardView, bountyView, leaderboardView, profileView } from './views.js';
import { esc } from './format.js';

const app = document.getElementById('app');
let seq = 0;

function viewFor(parts) {
  if (parts.length === 0) return boardView();
  const [head, arg, tail] = parts;
  if (head === 'bounty' && tail === 'leaderboard') return leaderboardView(arg);
  if (head === 'bounty') return bountyView(arg);
  if (head === 'leaderboard') return leaderboardView(arg);
  if (head === 'profile' || head === 'u') return profileView(arg);
  return boardView();
}

async function route() {
  const mine = ++seq;
  window.__shotReady = false;
  app.innerHTML = '<p class="loading">Loading live data…</p>';
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
    .map((part) => decodeURIComponent(part));
  try {
    const { html, mount } = await viewFor(parts);
    if (mine !== seq) return; // a newer navigation already owns the page
    app.innerHTML = html;
    if (mount) mount(app);
  } catch (err) {
    if (mine !== seq) return;
    app.innerHTML = '<div class="error"><h1>Could not load that page</h1><p>'
      + esc(err && err.message ? err.message : String(err))
      + '</p><p><a href="#/">Back to the board</a></p></div>';
  }
  window.__shotReady = true;
}

document.getElementById('lookup').addEventListener('submit', (event) => {
  event.preventDefault();
  const handle = String(new FormData(event.target).get('handle') || '')
    .trim().replace(/^@/, '');
  if (handle) location.hash = '#/profile/' + encodeURIComponent(handle);
});

window.addEventListener('hashchange', route);
route();
