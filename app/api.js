// Client for make.fun's public API with an in-memory ETag cache.
//
// Every answer is kept by URL. An answer younger than 30 seconds is served
// straight from the cache with no request at all; an older one is
// revalidated with If-None-Match, and when the API answers 304 the cached
// body is reused and its clock restarts. All views share this one cache, so
// moving between the board, a bounty and its leaderboard repeats few
// requests, and going back is instant while the data is fresh.

const API = 'https://make.fun/api';
const FRESH_MS = 30000;
const cache = new Map();

export async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  const now = Date.now();
  if (hit && now - hit.at < FRESH_MS) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    return hit.body;
  }
  if (!res.ok) throw new Error('make.fun API answered ' + res.status + ' for ' + path);
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('etag'), body, at: now });
  return body;
}

export const competitions = () => get('/competitions');
export const competition = (slug) => get('/competitions/' + encodeURIComponent(slug));
export const leaderboard = (slug) => get('/competitions/' + encodeURIComponent(slug) + '/leaderboard');
export const profile = (handle) => get('/profiles/' + encodeURIComponent(handle));
