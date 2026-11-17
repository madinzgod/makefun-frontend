// The data core: one ETag cache for the make.fun public API and in-place
// row patching. Everything else (wrappers, panel, formatters, views' shared
// helpers) lives in util.js, which builds on these three functions.

export const statsBox = { view: null };

const BASE = 'https://make.fun/api';
const cacheByUrl = new Map();

export async function fetchWithETag(path, { force = false } = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  const entry = cacheByUrl.get(url);
  if (entry && !force && Date.now() - entry.at < 30000) {
    if (statsBox.view) {
      statsBox.view.memory += 1;
      if (!statsBox.view.updatedAt) statsBox.view.updatedAt = entry.at;
    }
    return entry.data;
  }
  const headers = {};
  if (entry && entry.etag) headers['If-None-Match'] = entry.etag;
  let response;
  try {
    response = await fetch(url, { headers });
  } catch (err) {
    // Stale-if-error: a revalidation exchange can fail at the protocol
    // level (some browser stacks reject a 304 they cannot reconstruct).
    // With a cached body on hand the view must not break — serve it and
    // count the attempt; only a first-ever load has nothing to fall
    // back on and still throws.
    if (!entry) throw err;
    if (statsBox.view) statsBox.view.requests += 1;
    return entry.data;
  }
  if (statsBox.view) {
    statsBox.view.requests += 1;
    statsBox.view.updatedAt = Date.now();
  }
  const reused = revalidate304(response, entry);
  if (reused !== null) {
    if (statsBox.view) statsBox.view.unchanged += 1;
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

// Paints new items into the row elements already on the page, keyed by
// data-key; returns false when the visible set changed and a rebuild is due.
export function patchRowsInPlace(listEl, items, keyOf, paintItem) {
  const els = [...listEl.querySelectorAll('[data-key]')];
  if (els.map((el) => el.dataset.key).join('|') !== items.map(keyOf).join('|')) return false;
  items.forEach((item, i) => paintItem(els[i], item));
  return true;
}
