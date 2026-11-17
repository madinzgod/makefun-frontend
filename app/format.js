// Formatting helpers: every API string passes through esc() before it reaches HTML.

/** Escape a value for safe insertion into HTML text or attribute content. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A USD amount ('747.50', 500, '0.50') as '$747.50' or '$500'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** An ISO timestamp as a UTC date and time. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Just the calendar day of an ISO timestamp, in UTC. */
export function day(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** Time until an ISO deadline: '3d 4h left', '5h 12m left', '42m left', 'Closed'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'Closed';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return 'Under a minute left';
}

/** A win rate stored in micro units (956066) or as a fraction (0.956) as '95.6%'. */
export function percent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const frac = n > 1000 ? n / 1e6 : n > 1 ? n / 100 : n;
  return `${(frac * 100).toFixed(1)}%`;
}

/** A byte count as '915 KB' or '1.2 MB'. */
export function bytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** A wallet address shortened to '5vom…AbPn' form. */
export function shortAddress(address) {
  const s = String(address ?? '');
  return s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
}

/** Untrusted long text as escaped paragraphs: escaped first, so no markup in it can reach the page. */
export function paragraphs(text) {
  return esc(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
