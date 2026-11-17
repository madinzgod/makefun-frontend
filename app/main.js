// Router for the four surfaces, on hash routes: #/ (board), #/bounty/<slug>,
// #/bounty/<slug>/leaderboard and #/u/<handle>. window.__shotReady is false while
// a route loads and true once its data has rendered (error path included), so
// screenshot tooling knows when to shoot. One shared 30 s interval per view
// refreshes only the countdown spans.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { timeLeft } from './format.js';
import {
  boardList,
  boardView,
  bountyView,
  errorView,
  leaderboardRows,
  leaderboardView,
  notFoundView,
  profileView,
} from './views.js';

const app = document.getElementById('app');
const announcer = document.getElementById('announcer');
let clock = null;
let navigation = 0;

function stopClock() {
  if (clock !== null) clearInterval(clock);
  clock = null;
}

function startClock() {
  stopClock();
  if (!app.querySelector('[data-until]')) return;
  clock = setInterval(() => {
    for (const node of app.querySelectorAll('[data-until]')) {
      node.textContent = timeLeft(node.getAttribute('data-until'));
    }
  }, 30000);
}

function finish(title) {
  document.title = title;
  announcer.textContent = title;
  window.scrollTo(0, 0);
  startClock();
  window.__shotReady = true;
}

/* The board keeps its items so sorting and filtering re-render only the list. */
let boardItems = [];

function drawBoardList() {
  const query = (document.getElementById('filter')?.value || '').trim().toLowerCase();
  const sort = document.getElementById('sort')?.value || 'ending';
  let items = boardItems;
  if (query) {
    items = items.filter((b) =>
      [b.title, b.category, ...(Array.isArray(b.skills) ? b.skills : [])]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }
  const by = {
    ending: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    entries: (a, b) => (Number(b.submissionCount) || 0) - (Number(a.submissionCount) || 0),
  }[sort];
  const list = document.getElementById('board-list');
  if (list) {
    list.innerHTML = boardList([...items].sort(by));
    startClock();
  }
}

async function showBoard() {
  const data = await getBounties();
  boardItems = Array.isArray(data.items) ? data.items : [];
  app.innerHTML = boardView(boardItems);
  document.getElementById('filter').addEventListener('input', drawBoardList);
  document.getElementById('sort').addEventListener('change', drawBoardList);
  drawBoardList();
  finish('Open bounties | make.fun');
}

async function showBounty(slug) {
  const b = await getBounty(slug);
  app.innerHTML = bountyView(b, slug);
  finish(`${b.title} | make.fun`);
}

async function showLeaderboard(slug) {
  const data = await getLeaderboard(slug);
  app.innerHTML = leaderboardView(data, slug);
  const more = app.querySelector('[data-show-all]');
  if (more) {
    more.addEventListener('click', () => {
      const body = document.getElementById('lb-body');
      if (body) body.innerHTML = leaderboardRows(data, Number.MAX_SAFE_INTEGER);
      more.closest('.more')?.remove();
    });
  }
  const title = data.competition?.title || slug;
  finish(`Leaderboard: ${title} | make.fun`);
}

async function showProfile(handle) {
  const p = await getProfile(handle);
  app.innerHTML = profileView(p, handle);
  finish(`@${p.handle || handle} | make.fun`);
}

async function render() {
  const mine = ++navigation;
  window.__shotReady = false;
  stopClock();
  app.innerHTML = '<p class="loading" role="status">Loading…</p>';
  const hash = location.hash || '#/';
  const bounty = hash.match(/^#\/bounty\/([^/]+)(\/leaderboard)?\/?$/);
  const profile = hash.match(/^#\/u\/([^/]+)\/?$/);
  try {
    if (bounty && bounty[2]) await showLeaderboard(decodeURIComponent(bounty[1]));
    else if (bounty) await showBounty(decodeURIComponent(bounty[1]));
    else if (profile) await showProfile(decodeURIComponent(profile[1]));
    else if (hash === '#/' || hash === '#' || hash === '') await showBoard();
    else {
      app.innerHTML = notFoundView();
      finish('Page not found | make.fun');
    }
  } catch (err) {
    if (mine !== navigation) return;
    app.innerHTML = errorView(err instanceof Error ? err.message : 'The request failed.');
    document.title = 'Could not load | make.fun';
    announcer.textContent = 'That page could not be loaded.';
    window.__shotReady = true;
  }
}

app.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('[data-retry]')) render();
});
window.addEventListener('hashchange', render);
render();
