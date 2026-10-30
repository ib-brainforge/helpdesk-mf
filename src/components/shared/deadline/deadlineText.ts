/*
 * How a deadline POLICY reads, in one place: target times, the business
 * clock, and the one-sentence summary of a priority's deadlines.
 *
 * Used by Tenant Deadlines (list and policy pages), the ticket page's
 * deadline box, the New Request review step and the Reports policy banner.
 * Elapsed time on a live ticket ("Overdue 2h") is formatDuration in
 * deadline.ts, which rolls hours into days; a target never does, since a 24
 * hour fix target is three business days, not "1d".
 *
 * Nothing here works out a deadline: the backend does.
 */

export type ClockMode = 'BusinessHours' | 'AllHours';

/** "30 min", "4 h", "1 h 30 min". Hours and minutes, never days. */
export const formatMinutes = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/**
 * A target in words for a sentence: "30 min", "4 business hours", "1 hour",
 * "1 h 30 min of business time". Business time is said when it is counted
 * that way and the target is an hour or more (under an hour it rarely
 * matters, and "30 business minutes" reads oddly).
 */
export const formatTarget = (minutes: number, clockMode: ClockMode): string => {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const business = clockMode === 'BusinessHours';
  if (m) return `${h} h ${m} min${business ? ' of business time' : ''}`;
  return `${h} ${business ? 'business ' : ''}hour${h === 1 ? '' : 's'}`;
};

/**
 * Reads what someone typed as a duration: "30", "30 min", "30m", "4 h",
 * "4 hours", "1h 30m", "1.5 h", "2 days" (24 h each). A bare number is
 * minutes. Null when it cannot be read.
 */
export const parseDuration = (text: string): number | null => {
  const s = text.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  const re =
    /(\d+(?:\.\d+)?)\s*(d|days?|h|hrs?|hours?|m|mins?|minutes?)(?![a-z])/g;
  let total = 0;
  let matched = '';
  for (const match of s.matchAll(re)) {
    const n = Number(match[1]);
    const unit = match[2][0];
    total += unit === 'd' ? n * 1440 : unit === 'h' ? n * 60 : n;
    matched += match[0];
  }
  // Every non-space character has to belong to a number and its unit.
  if (!matched || matched.replace(/\s/g, '') !== s.replace(/\s/g, ''))
    return null;
  return Math.round(total);
};

/** "08:00" as "8:00 am". */
export const formatClockTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

/** Monday first, the way pages list the week. 0 is Sunday, as the API has it. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const SHORT_DAY: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export interface ClockDay {
  dayOfWeek: number;
  isOpen: boolean;
  start: string;
  end: string;
}

/**
 * "Mon to Fri, 8:00 am to 5:30 pm". Days in a run with the same hours are
 * grouped; anything irregular is listed, separated by semicolons.
 */
export const describeHours = (policy: {
  clockMode: ClockMode;
  days: ClockDay[];
}): string => {
  if (policy.clockMode === 'AllHours') return 'All hours (24/7)';
  const open = DAY_ORDER.map(d =>
    policy.days.find(x => x.dayOfWeek === d),
  ).filter((d): d is ClockDay => Boolean(d?.isOpen));
  if (open.length === 0) return 'Closed every day';
  const groups: { from: number; to: number; start: string; end: string }[] = [];
  for (const d of open) {
    const last = groups[groups.length - 1];
    const prevIndex = last
      ? DAY_ORDER.indexOf(last.to as (typeof DAY_ORDER)[number])
      : -2;
    const index = DAY_ORDER.indexOf(d.dayOfWeek as (typeof DAY_ORDER)[number]);
    if (
      last &&
      index === prevIndex + 1 &&
      last.start === d.start &&
      last.end === d.end
    ) {
      last.to = d.dayOfWeek;
    } else {
      groups.push({
        from: d.dayOfWeek,
        to: d.dayOfWeek,
        start: d.start,
        end: d.end,
      });
    }
  }
  return groups
    .map(g => {
      const days =
        g.from === g.to
          ? SHORT_DAY[g.from]
          : `${SHORT_DAY[g.from]} to ${SHORT_DAY[g.to]}`;
      return `${days}, ${formatClockTime(g.start)} to ${formatClockTime(g.end)}`;
    })
    .join('; ');
};

/** The time zones offered, with the holiday region each one suggests. */
export const TIME_ZONES = [
  { id: 'Australia/Sydney', city: 'Sydney', region: 'NSW' },
  { id: 'Australia/Melbourne', city: 'Melbourne', region: 'VIC' },
  { id: 'Australia/Brisbane', city: 'Brisbane', region: 'QLD' },
  { id: 'Australia/Adelaide', city: 'Adelaide', region: 'SA' },
  { id: 'Australia/Perth', city: 'Perth', region: 'WA' },
  { id: 'Australia/Hobart', city: 'Hobart', region: 'TAS' },
  { id: 'Australia/Darwin', city: 'Darwin', region: 'NT' },
] as const;

/** "Sydney time". */
export const timeZoneCity = (id: string): string =>
  `${TIME_ZONES.find(z => z.id === id)?.city ?? id} time`;

/**
 * "Sydney time (AEDT)". The abbreviation is read for the given date, so it
 * follows daylight saving.
 */
export const timeZoneLabel = (id: string, at: Date = new Date()): string => {
  const city = timeZoneCity(id);
  try {
    const abbr = new Intl.DateTimeFormat('en-AU', {
      timeZone: id,
      timeZoneName: 'short',
    })
      .formatToParts(at)
      .find(p => p.type === 'timeZoneName')?.value;
    return abbr ? `${city} (${abbr})` : city;
  } catch {
    return city;
  }
};

/** "NSW holidays", or "no public holidays". */
export const holidaysText = (region: string | null | undefined): string =>
  region ? `${region} holidays` : 'no public holidays';

/**
 * The whole clock in one line: "Mon to Fri, 8:00 am to 5:30 pm, Sydney time,
 * NSW holidays", or "24/7, Sydney time". Holidays only matter on business
 * hours, so 24/7 leaves them out.
 */
export const describeClock = (policy: {
  clockMode: ClockMode;
  days: ClockDay[];
  timeZoneId: string;
  holidayRegion?: string | null;
}): string =>
  policy.clockMode === 'AllHours'
    ? `24/7, ${timeZoneCity(policy.timeZoneId)}`
    : `${describeHours(policy)}, ${timeZoneCity(policy.timeZoneId)}, ${holidaysText(policy.holidayRegion)}`;

/**
 * The server's clock text as a clause: "Mon to Fri, 8:00 am to 5:30 pm
 * Sydney time." without the full stop, so it sits inside a sentence.
 */
export const clockClause = (text: string | null | undefined): string =>
  (text ?? '').trim().replace(/\.$/, '');

/**
 * One priority's deadlines as a sentence: "Critical: reply within 30 min,
 * fix within 4 business hours (Mon to Fri, 8:00 am to 5:30 pm, Sydney time,
 * NSW holidays)". The clock is left out when not given.
 */
export const formatDeadlineSentence = (
  target: {
    priority: string;
    replyMinutes: number;
    fixMinutes: number;
    clockMode: ClockMode;
  },
  clock?: string | null,
): string => {
  const text = `${target.priority}: reply within ${formatTarget(target.replyMinutes, target.clockMode)}, fix within ${formatTarget(target.fixMinutes, target.clockMode)}`;
  const c = clockClause(clock);
  return c ? `${text} (${c})` : text;
};
