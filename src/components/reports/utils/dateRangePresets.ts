/**
 * The date ranges the Reports header offers, and how each one resolves.
 *
 * WHY PRESETS RATHER THAN A CALENDAR
 * Reports are read at a few habitual scopes ("last 30 days", "this month"), and
 * a two-ended calendar makes the common case the slowest one: two pickers, two
 * clicks each, to land on a range you pick nearly every time. It also states
 * the range as two absolute dates ("Aug 17 - Sep 25"), which says what was
 * chosen but not what it MEANS, so a glance cannot tell a deliberate window
 * from a stale one left behind by an earlier visit.
 *
 * A preset carries its intent in its name and re-resolves on every render, so
 * "This Month" still means this month tomorrow.
 *
 * LOCAL DATES, NOT UTC
 * Every boundary here is built from local calendar parts. The obvious
 * `toISOString().split('T')[0]` is UTC, and for anyone east of Greenwich (AEST
 * is UTC+10) that is yesterday for the first ten hours of every day: "Today"
 * would quietly report yesterday each morning, and "This Month" would start a
 * day early. The API takes plain YYYY-MM-DD day boundaries, so the calendar day
 * the user is actually living in is the correct one.
 */

export type ReportRangeKey =
  | 'today'
  | 'last-7-days'
  | 'last-30-days'
  | 'last-90-days'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-year';

export interface ReportRange {
  startDate: string;
  endDate: string;
}

/** Order is the order they appear in the dropdown. */
export const REPORT_RANGE_OPTIONS: { key: ReportRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last-7-days', label: 'Last 7 Days' },
  { key: 'last-30-days', label: 'Last 30 Days' },
  { key: 'last-90-days', label: 'Last 90 Days' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'this-quarter', label: 'This Quarter' },
  { key: 'this-year', label: 'This Year' },
];

export const REPORT_DEFAULT_RANGE: ReportRangeKey = 'last-30-days';

/** YYYY-MM-DD from a Date's LOCAL parts. See the note above on UTC. */
const toLocalDay = (d: Date): string => {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * `daysBack` counts the window INCLUSIVE of today, so "Last 7 Days" is today
 * plus the six before it, not today minus seven. Off-by-one here is the
 * difference between a 7 and an 8 point series on a daily chart.
 */
const daysBack = (n: number, from: Date): Date =>
  new Date(from.getFullYear(), from.getMonth(), from.getDate() - (n - 1));

/**
 * Resolve a preset against a reference day (injectable so this is testable
 * without freezing the clock; callers pass nothing and get today).
 */
export const resolveReportRange = (
  key: ReportRangeKey,
  now: Date = new Date(),
): ReportRange => {
  const today = toLocalDay(now);

  switch (key) {
    case 'today':
      return { startDate: today, endDate: today };

    case 'last-7-days':
      return { startDate: toLocalDay(daysBack(7, now)), endDate: today };

    case 'last-30-days':
      return { startDate: toLocalDay(daysBack(30, now)), endDate: today };

    case 'last-90-days':
      return { startDate: toLocalDay(daysBack(90, now)), endDate: today };

    case 'this-month':
      return {
        startDate: toLocalDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: today,
      };

    case 'last-month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // Day 0 of this month is the last day of the previous one, which also
      // gets February and leap years right without any month-length table.
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: toLocalDay(first), endDate: toLocalDay(last) };
    }

    case 'this-quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        startDate: toLocalDay(new Date(now.getFullYear(), quarterStartMonth, 1)),
        endDate: today,
      };
    }

    case 'this-year':
      return {
        startDate: toLocalDay(new Date(now.getFullYear(), 0, 1)),
        endDate: today,
      };

    default:
      return { startDate: toLocalDay(daysBack(30, now)), endDate: today };
  }
};
