// Shared data layer: one ETag cache for the make.fun public API, the
// per-view requests panel, in-place row patching, and format helpers.

export const API_BASE = 'https://make.fun/api';

export async function fetchWithETag(path, { force = false } = {}) {
  const url = path.startsWith('http') ? path : API_BASE + path;
  const entry = cacheByUrl.get(url);
  if (entry && !force && Date.now() - entry.at < FRESH_MS) {
    if (viewStats) {
      viewStats.memory += 1;
      if (!viewStats.updatedAt) viewStats.updatedAt = entry.at;
    }
    return entry.data;
  }
  const headers = {};
  if (entry && entry.etag) headers['If-None-Match'] = entry.etag;
  const response = await fetch(url, { headers });
  if (viewStats) {
    viewStats.requests += 1;
    viewStats.updatedAt = Date.now();
  }
  const reused = revalidate304(response, entry);
  if (reused !== null) {
    if (viewStats) viewStats.unchanged += 1;
    return reused;
  }
  if (!response.ok) throw new Error(`make.fun API answered ${response.status} for ${url}`);
  const data = await response.json();
  cacheByUrl.set(url, { etag: response.headers.get('etag'), data, at: Date.now() });
  return data;
}

// A 304 revalidates the cached entry: same body, fresh timestamp.
export function revalidate304(response, entry) {
  if (response.status !== 304 || !entry) return null;
  entry.at = Date.now();
  return entry.data;
}

export function apiCompetitions(options) {
  return fetchWithETag('/competitions', options);
}

export function apiCompetition(slug, options) {
  return fetchWithETag(`/competitions/${encodeURIComponent(slug)}`, options);
}

export function apiLeaderboard(slug, options) {
  return fetchWithETag(`/competitions/${encodeURIComponent(slug)}/leaderboard`, options);
}

export function apiProfile(handle, options) {
  return fetchWithETag(`/profiles/${encodeURIComponent(handle)}`, options);
}

export function beginViewStats() {
  viewStats = { requests: 0, unchanged: 0, memory: 0, updatedAt: 0 };
  return viewStats;
}

export function cacheStats() {
  if (!viewStats) beginViewStats();
  const ageS = viewStats.updatedAt
    ? Math.max(0, Math.round((Date.now() - viewStats.updatedAt) / 1000))
    : 0;
  return { ...viewStats, ageS };
}

export function requestsPanelText(stats) {
  return `this view: ${stats.requests} API requests, ${stats.unchanged} unchanged (304), ${stats.memory} from memory, updated ${stats.ageS} s ago`;
}

export function requestsPanelHtml() {
  return `<div class="requests-panel"><span class="rp-text">${requestsPanelText(cacheStats())}</span><button type="button" class="rp-refresh">Refresh</button></div>`;
}

export function paintRequestsPanel(panel) {
  const text = panel.querySelector('.rp-text');
  if (text) text.textContent = requestsPanelText(cacheStats());
}

// Paints new items into the row elements already on the page, keyed by
// data-key; returns false when the visible set changed and a rebuild is due.
export function patchRowsInPlace(listEl, items, keyOf, paintItem) {
  const els = [...listEl.querySelectorAll('[data-key]')];
  if (els.map((el) => el.dataset.key).join('|') !== items.map(keyOf).join('|')) return false;
  items.forEach((item, i) => paintItem(els[i], item));
  return true;
}

const FRESH_MS = 30000;
const cacheByUrl = new Map();
let viewStats = null;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function formatUsd(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
}

// Win rates travel in micro units: 956066 means 95.6%.
export function formatWinRate(micro) {
  const n = Number(micro);
  return Number.isFinite(n) ? `${(n / 10000).toFixed(1)}%` : '—';
}

export function formatInterval(lowMicro, highMicro) {
  return `${formatWinRate(lowMicro)}–${formatWinRate(highMicro)}`;
}

export function formatTimeLeft(deadlineIso, now = Date.now()) {
  const ms = new Date(deadlineIso).getTime() - now;
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'ended';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m left`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

// Liveness is told by the deadline, never the status alone: a bounty past
// its deadline takes no entries even while its status still reads open.
export function isLiveByDeadline(item, now = Date.now()) {
  if (item && item.deadline) return new Date(item.deadline).getTime() > now;
  return Boolean(item) && item.status !== 'resolved';
}

export function absolutize(url) {
  if (!url) return '';
  return url.startsWith('/') ? `https://make.fun${url}` : url;
}
