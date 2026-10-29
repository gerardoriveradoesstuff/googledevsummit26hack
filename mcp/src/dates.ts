// Date helpers. "Today" is the distributor's day in America/Los_Angeles (the API stores -07:00 local times).
export const TZ = process.env.TZ_DISPLAY || 'America/Los_Angeles';

/** YYYY-MM-DD for an instant, in the distributor's timezone. */
export function isoDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** YYYY-MM-DD HH:MM:SS for an instant, in the distributor's timezone (same shape the PHP API returns). */
export function isoDateTime(d: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Add whole days to a YYYY-MM-DD string (calendar math, no timezone drift). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Accepts YYYY-MM-DD or today/tomorrow/yesterday (also hoy/mañana/ayer). Returns YYYY-MM-DD or null. */
export function resolveDate(input: string | undefined): string | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  const today = isoDate();
  if (v === 'today' || v === 'hoy') return today;
  if (v === 'tomorrow' || v === 'mañana' || v === 'manana') return addDays(today, 1);
  if (v === 'yesterday' || v === 'ayer') return addDays(today, -1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Fri Oct 30 (tomorrow)" */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const today = isoDate();
  const rel =
    iso === today ? ' (today)'
    : iso === addDays(today, 1) ? ' (tomorrow)'
    : iso === addDays(today, -1) ? ' (yesterday)'
    : '';
  return `${wd} ${MONTH[m - 1]} ${d}${rel}`;
}

/** "Oct 29 12:55 PM" from "2026-10-29 12:55:20" */
export function prettyDateTime(sql: string | null | undefined): string {
  if (!sql) return '';
  const [date, time = '00:00:00'] = sql.split(' ');
  const [, m, d] = date.split('-').map(Number);
  let [h, min] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${MONTH[m - 1]} ${d} ${h}:${String(min).padStart(2, '0')} ${ampm}`;
}
