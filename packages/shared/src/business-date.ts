/** Local calendar date with a 5:00 cutoff so the madrugada still counts as the previous service day. */
export const BUSINESS_DAY_CUTOFF_HOUR = 5;

export function businessDateIso(
  now: Date = new Date(),
  timeZone = 'America/Mexico_City',
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  let year = get('year');
  let month = get('month');
  let day = get('day');
  const hour = get('hour');
  if (hour < BUSINESS_DAY_CUTOFF_HOUR) {
    const prev = new Date(Date.UTC(year, month - 1, day) - 24 * 60 * 60 * 1000);
    year = prev.getUTCFullYear();
    month = prev.getUTCMonth() + 1;
    day = prev.getUTCDate();
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
