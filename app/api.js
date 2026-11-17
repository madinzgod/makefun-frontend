// make.fun's public API (https://make.fun/api), read-only GETs from any origin.
// Answers are cached with their ETag: a repeat view inside 30 s makes no request,
// a later view revalidates with If-None-Match (an unchanged answer costs a 304;
// the API's tags turn over each minute). Views of one URL share one request.

const API = 'https://make.fun/api';
const SOFT_TTL_MS = 30000;

const cache = new Map(); // url -> { etag, data, at }
const inflight = new Map(); // url -> Promise<data>

export function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < SOFT_TTL_MS) return Promise.resolve(hit.data);
  const pending = inflight.get(url);
  if (pending) return pending;

  const request = (async () => {
    const headers = {};
    if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
    const res = await fetch(url, { headers });
    if (res.status === 304 && hit) {
      hit.at = Date.now();
      return hit.data;
    }
    if (!res.ok) throw new Error(`make.fun answered HTTP ${res.status}`);
    const data = await res.json();
    cache.set(url, { etag: res.headers.get('etag'), data, at: Date.now() });
    return data;
  })();

  inflight.set(url, request);
  const settle = () => {
    if (inflight.get(url) === request) inflight.delete(url);
  };
  request.then(settle, settle);
  return request;
}

/** The bounty board: { items: [...] } (activity=times keeps the payload lean). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty's full page data, by slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** One bounty's leaderboard envelope: competition, phase, columns, entries. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** One account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
