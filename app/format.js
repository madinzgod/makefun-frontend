// Formatting helpers shared by the views: money, percents, counts, dates,
// and the HTML escaping every interpolated string goes through.

export function usd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  const digits = n >= 1000 ? 0 : 2;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Win rates travel in micro units: a judge value of 956066 means 95.6066%.
export function pct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '–';
  return (n / 10000).toFixed(1) + '%';
}

export function count(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function day(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '–';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// "3d 4h left" while a deadline is still ahead, "ended 2h ago" once it has
// passed: whether a bounty still takes entries is read off its deadline.
export function timeLeft(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const ms = t - Date.now();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const span = d > 0 ? d + 'd ' + h + 'h' : h > 0 ? h + 'h ' + m + 'm' : m + 'm';
  return ms >= 0 ? span + ' left' : 'ended ' + span + ' ago';
}

export function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
