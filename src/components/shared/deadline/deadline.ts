/*
 * The one deadline formatter, shared by the Tickets list, the ticket detail,
 * the New Request preview, Company Deadlines and the KPI reports.
 *
 * No deadline maths happens here. The backend computes every due and warning
 * instant in the company's business hours; this module only compares those
 * instants with the clock and puts words to the result. Keep it that way: a
 * second calculation in JS would disagree with the backend the first time a
 * holiday or a weekend falls inside a target.
 */
import type { TicketDeadlineDto } from '@/api/local/deadlines';

export type DeadlineState = 'onTrack' | 'dueSoon' | 'overdue';

export type DeadlineTargetKind = 'reply' | 'fix';

export interface DeadlineTarget {
  kind: DeadlineTargetKind;
  dueAt: string;
  warnAt: string | null;
}

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;
const LOCALE = 'en-AU';

/**
 * The earliest instant a deadline can plausibly fall on. Anything before it is
 * a default date leaking out of the backend (a year 1 fix date showed as
 * "Overdue 739809d"), not a real target, so it is read as no deadline at all.
 */
const EARLIEST_PLAUSIBLE_MS = Date.UTC(2000, 0, 1);

const toMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) || ms < EARLIEST_PLAUSIBLE_MS ? null : ms;
};

/** The instant itself when it is a real date, else null. */
const plausible = (iso: string | null | undefined): string | null =>
  toMs(iso) === null ? null : (iso as string);

/**
 * The deadlines with every impossible instant (unparseable, or before 2000)
 * turned into "none", so no screen shows a 2000 year overdue. Apply it before
 * reading the instants directly; the helpers below already do.
 */
export const sanitiseDeadline = <T extends TicketDeadlineDto>(
  deadline: T,
): T => ({
  ...deadline,
  replyDueAt: plausible(deadline.replyDueAt),
  replyWarnAt: plausible(deadline.replyWarnAt),
  fixDueAt: plausible(deadline.fixDueAt),
  fixWarnAt: plausible(deadline.fixWarnAt),
});

/**
 * The target the ticket is working towards now: the first reply until there
 * is one, then the fix. Null once the ticket is fixed, or when it has no
 * deadline at all.
 */
export const getNextTarget = (
  raw: TicketDeadlineDto | null | undefined,
): DeadlineTarget | null => {
  if (!raw || raw.fixedAt) return null;
  const deadline = sanitiseDeadline(raw);
  if (!deadline.repliedAt && deadline.replyDueAt) {
    return {
      kind: 'reply',
      dueAt: deadline.replyDueAt,
      warnAt: deadline.replyWarnAt,
    };
  }
  if (deadline.fixDueAt) {
    return {
      kind: 'fix',
      dueAt: deadline.fixDueAt,
      warnAt: deadline.fixWarnAt,
    };
  }
  return null;
};

/**
 * On track, Due soon or Overdue, by the backend's rule: at or after the due
 * instant is Overdue, at or after the warning instant is Due soon. Null when
 * there is nothing to chase (fixed, or no deadline).
 */
export const getDeadlineState = (
  deadline: TicketDeadlineDto | null | undefined,
  now: number = Date.now(),
): DeadlineState | null => {
  const target = getNextTarget(deadline);
  if (!target) return null;
  const due = toMs(target.dueAt);
  if (due === null) return null;
  if (now >= due) return 'overdue';
  const warn = toMs(target.warnAt);
  if (warn !== null && now >= warn) return 'dueSoon';
  return 'onTrack';
};

/**
 * A duration in minutes as "45m", "1h 42m" or "1d 3h". Always the absolute
 * value, so callers add their own words ("Overdue ", "Late by ").
 */
export const formatDuration = (minutes: number): string => {
  const total = Math.max(1, Math.round(Math.abs(minutes)));
  if (total < 60) return `${total}m`;
  if (total < DAY_MINUTES) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(total / DAY_MINUTES);
  const h = Math.floor((total % DAY_MINUTES) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
};

/*
 * Formatters by zone and options. Building an Intl.DateTimeFormat is slow
 * next to using one, and every chip on the list formats on every minute
 * tick, so each distinct formatter is built once.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();
const formatterFor = (
  timezone: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat => {
  const key = `${timezone ?? ''}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat(LOCALE, {
        ...options,
        timeZone: timezone ?? undefined,
      });
    } catch {
      // An invalid IANA zone falls back to the browser's, as formatDateTime does.
      formatter = new Intl.DateTimeFormat(LOCALE, options);
    }
    formatters.set(key, formatter);
  }
  return formatter;
};

const parts = (
  iso: string,
  timezone: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> => {
  const date = new Date(iso);
  const formatter = formatterFor(timezone, options);
  const out: Record<string, string> = {};
  for (const p of formatter.formatToParts(date)) out[p.type] = p.value;
  return out;
};

/** "Fri 09/10": a short day and date, for a target more than a day out. */
export const formatDeadlineDay = (
  iso: string,
  timezone?: string | null,
): string => {
  const p = parts(iso, timezone, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  return `${p.weekday} ${p.day}/${p.month}`;
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

const joinDateTime = (p: Record<string, string>): string =>
  `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute} ${p.dayPeriod?.toLowerCase() ?? ''}`.trim();

/** "Thu 08/10/2026 4:12 pm": the full due date and time. */
export const formatDeadlineDateTime = (
  iso: string,
  timezone?: string | null,
): string => {
  const p = parts(iso, timezone, { ...DATE_TIME_OPTIONS, weekday: 'short' });
  return `${p.weekday} ${joinDateTime(p)}`;
};

/** "Fri 09/10 4:00 pm": a target's day and time, without the year. */
export const formatDeadlineDayTime = (
  iso: string,
  timezone?: string | null,
): string => {
  const p = parts(iso, timezone, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${p.weekday} ${p.day}/${p.month} ${p.hour}:${p.minute} ${p.dayPeriod?.toLowerCase() ?? ''}`.trim();
};

/**
 * "08/10/2026 4:12 pm": a date and time the way Netcorp reads them, for an
 * instant that is not a target (a History row, for example).
 */
export const formatDateTimeAmPm = (
  iso: string,
  timezone?: string | null,
): string => joinDateTime(parts(iso, timezone, DATE_TIME_OPTIONS));

/**
 * The chip's words: "Reply in 22m", "Fix in 1h 42m", "Overdue 2h", or
 * "Fix by Fri 09/10" once the target is more than a day away. Empty when
 * there is nothing to chase.
 */
export const formatDeadlineLabel = (
  deadline: TicketDeadlineDto | null | undefined,
  now: number = Date.now(),
  timezone?: string | null,
): string => {
  const target = getNextTarget(deadline);
  const due = toMs(target?.dueAt);
  if (!target || due === null) return '';
  const word = target.kind === 'reply' ? 'Reply' : 'Fix';
  const minutes = (due - now) / MINUTE;
  if (minutes <= 0) return `Overdue ${formatDuration(minutes)}`;
  if (minutes < DAY_MINUTES) return `${word} in ${formatDuration(minutes)}`;
  return `${word} by ${formatDeadlineDay(target.dueAt, timezone)}`;
};

/**
 * Whether a finished ticket met its deadlines: the fix by its due time, and
 * the first reply by its due time. Closing a ticket answers it, so a ticket
 * closed without a public reply counts its close as the reply. Null while
 * the ticket is open, or when it never had a deadline.
 */
export const isDeadlineMet = (
  deadline: TicketDeadlineDto | null | undefined,
): boolean | null => {
  if (!deadline?.fixedAt) return null;
  const fixed = toMs(deadline.fixedAt);
  const fixDue = toMs(deadline.fixDueAt);
  const replyDue = toMs(deadline.replyDueAt);
  if (fixDue === null && replyDue === null) return null;
  const replied = toMs(deadline.repliedAt) ?? fixed;
  const fixMet = fixDue === null || (fixed !== null && fixed <= fixDue);
  const replyMet =
    replyDue === null || (replied !== null && replied <= replyDue);
  return fixMet && replyMet;
};
