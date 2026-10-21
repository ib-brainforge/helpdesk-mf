/*
 * Display helpers for the KPI report. The figures themselves all come from
 * the backend (one KPI endpoint); this only words them.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-09" for a date's calendar month, in local time. */
export const toMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** "September 2026" from "2026-09". */
export const monthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  return MONTH_NAMES[m - 1] ? `${MONTH_NAMES[m - 1]} ${y}` : key;
};

/** "2026-08" from "2026-09": the month a figure is compared with. */
export const previousMonthKey = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  return toMonthKey(new Date(y, m - 2, 1));
};

/** "August" from "2026-09". */
export const monthName = (key: string): string =>
  MONTH_NAMES[Number(key.split('-')[1]) - 1] ?? key;

/** The Period choices: this month so far, then the twelve before it. */
export const monthOptions = (now: Date = new Date()) =>
  Array.from({ length: 13 }, (_, i) => {
    const key = toMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    return {
      key,
      label: i === 0 ? `${monthLabel(key)} (so far)` : monthLabel(key),
    };
  });

/**
 * The current month (so far): what the report opens on. Opening on last
 * month read as stale ("September" on 21 October), and a manager checking in
 * wants how this month is going. Last month is one pick away.
 */
export const defaultMonth = (now: Date = new Date()): string =>
  toMonthKey(new Date(now.getFullYear(), now.getMonth(), 1));

export const formatPct = (pct: number | null | undefined): string =>
  pct === null || pct === undefined ? '–' : `${pct.toFixed(1)}%`;

export const formatScore = (score: number | null | undefined): string =>
  score === null || score === undefined ? '–' : score.toFixed(1);

/** "06/07" from "2026-07-06", the weekly chart's labels. */
export const weekLabel = (ymd: string): string => {
  const [, m, d] = ymd.split('-');
  return d && m ? `${d}/${m}` : ymd;
};
