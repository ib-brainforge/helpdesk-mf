/*
 * Display helpers and the form model for a company's deadline policy.
 *
 * Nothing here works out a deadline. The backend does all of that, and the
 * worked example asks it (previewCompanyDeadline). These only say how the
 * policy reads and keep the form in a fixed order.
 */
import type {
  CompanyDeadlinePolicyInput,
  DeadlinePriority,
} from '@/api/local/deadlines';
import { z } from 'zod';

/** Monday first, the way the page lists the week. 0 is Sunday, as the API has it. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const PRIORITIES: DeadlinePriority[] = [
  'Critical',
  'High',
  'Normal',
  'Low',
];

export const HOLIDAY_CALENDARS = [
  { key: 'AU-NSW', label: 'NSW public holidays' },
  { key: 'none', label: 'No public holidays' },
] as const;

const TIME_ZONES = [
  { id: 'Australia/Sydney', city: 'Sydney' },
  { id: 'Australia/Brisbane', city: 'Brisbane' },
  { id: 'Australia/Adelaide', city: 'Adelaide' },
  { id: 'Australia/Darwin', city: 'Darwin' },
  { id: 'Australia/Perth', city: 'Perth' },
  { id: 'Australia/Hobart', city: 'Hobart' },
];

/**
 * "Sydney time (AEDT)". The abbreviation is read for today's date, so it
 * follows daylight saving rather than being fixed in the label.
 */
export const timeZoneLabel = (id: string, at: Date = new Date()): string => {
  const city = TIME_ZONES.find(z => z.id === id)?.city ?? id;
  try {
    const abbr = new Intl.DateTimeFormat('en-AU', {
      timeZone: id,
      timeZoneName: 'short',
    })
      .formatToParts(at)
      .find(p => p.type === 'timeZoneName')?.value;
    return abbr ? `${city} time (${abbr})` : `${city} time`;
  } catch {
    return `${city} time`;
  }
};

export const timeZoneOptions = (current: string) => {
  const ids = TIME_ZONES.map(z => z.id);
  if (current && !ids.includes(current)) ids.unshift(current);
  return ids.map(id => ({ id, label: timeZoneLabel(id) }));
};

/** "08:00" to "8:00 am". */
export const formatClock = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

/** Every half hour, as "HH:mm". */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

/**
 * A target in business time: "30 min", "1 h", "24 h", "1 h 30 min". Not
 * Ari's formatDuration, which is for elapsed wall time and rolls hours into
 * days; a 24 hour fix target is three business days, not "1d".
 */
export const formatTargetMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export type TargetUnit = 'minutes' | 'hours';
export const UNIT_MINUTES: Record<TargetUnit, number> = {
  minutes: 1,
  hours: 60,
};
/** Hours when the value is whole hours, otherwise minutes. */
export const unitFor = (minutes: number): TargetUnit =>
  minutes >= 60 && minutes % 60 === 0 ? 'hours' : 'minutes';

const SHORT_DAY: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

/**
 * "Mon to Fri, 8:00 am to 5:30 pm", for rows the server sends no text for
 * (the default, and companies that inherit it). Days with the same hours in a
 * run are grouped; anything irregular is listed.
 */
export const describeHours = (
  policy: Pick<CompanyDeadlinePolicyInput, 'clockMode' | 'days'>,
): string => {
  if (policy.clockMode === 'AllHours') return 'All hours (24/7)';
  const open = DAY_ORDER.map(d =>
    policy.days.find(x => x.dayOfWeek === d),
  ).filter(d => d?.isOpen) as CompanyDeadlinePolicyInput['days'];
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
      return `${days}, ${formatClock(g.start)} to ${formatClock(g.end)}`;
    })
    .join('; ');
};

// ── Form model ──────────────────────────────────────────────────────────────

const daySchema = z.object({
  dayOfWeek: z.number(),
  isOpen: z.boolean(),
  start: z.string(),
  end: z.string(),
});

const targetSchema = z.object({
  priority: z.enum(['Critical', 'High', 'Normal', 'Low']),
  replyMinutes: z.number({ invalid_type_error: 'Enter a number' }),
  fixMinutes: z.number({ invalid_type_error: 'Enter a number' }),
});

/** The server validates the same rules; these give the message beside the field. */
export const policyFormSchema = z
  .object({
    clockMode: z.enum(['BusinessHours', 'AllHours']),
    timeZoneId: z.string().min(1),
    /** "none" in the form, null on the wire. */
    holidayCalendar: z.string(),
    days: z.array(daySchema).length(7),
    targets: z.array(targetSchema).length(4),
    applyToOpenTickets: z.boolean(),
  })
  .superRefine((v, ctx) => {
    v.targets.forEach((t, i) => {
      if (!(t.replyMinutes > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targets', i, 'replyMinutes'],
          message: 'More than 0',
        });
      }
      if (!(t.fixMinutes >= t.replyMinutes)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targets', i, 'fixMinutes'],
          message: 'Fix by must be at least the reply time',
        });
      }
    });
    if (v.clockMode === 'BusinessHours') {
      v.days.forEach((d, i) => {
        if (d.isOpen && d.end <= d.start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['days', i, 'end'],
            message: 'Must be after the start',
          });
        }
      });
      if (!v.days.some(d => d.isOpen)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days'],
          message: 'Open at least one day, or count all hours',
        });
      }
    }
  });

export type PolicyFormValues = z.infer<typeof policyFormSchema>;

/** The policy in the form's fixed order: Monday first, Critical first. */
export const toFormValues = (
  policy: CompanyDeadlinePolicyInput | undefined,
): PolicyFormValues => ({
  clockMode: policy?.clockMode ?? 'BusinessHours',
  timeZoneId: policy?.timeZoneId ?? 'Australia/Sydney',
  holidayCalendar: policy?.holidayCalendar ?? 'none',
  days: DAY_ORDER.map(dayOfWeek => {
    const d = policy?.days.find(x => x.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      isOpen: d?.isOpen ?? (dayOfWeek >= 1 && dayOfWeek <= 5),
      start: d?.start ?? '08:00',
      end: d?.end ?? '17:30',
    };
  }),
  targets: PRIORITIES.map(priority => {
    const t = policy?.targets.find(x => x.priority === priority);
    return {
      priority,
      // Only before the policy loads; the page waits for it, and the server
      // owns the defaults.
      replyMinutes: t?.replyMinutes ?? 0,
      fixMinutes: t?.fixMinutes ?? 0,
    };
  }),
  applyToOpenTickets: false,
});

/** The form back to the API's input shape. */
export const toPolicyInput = (
  v: Omit<PolicyFormValues, 'applyToOpenTickets'>,
): CompanyDeadlinePolicyInput => ({
  clockMode: v.clockMode,
  timeZoneId: v.timeZoneId,
  holidayCalendar: v.holidayCalendar === 'none' ? null : v.holidayCalendar,
  days: v.days.map(d => ({ ...d })),
  targets: v.targets.map(t => ({ ...t })),
});

/** "05/10/2026" from "2026-10-05", without going through a Date and a time zone. */
export const formatIsoDate = (ymd: string): string => {
  const [y, m, d] = ymd.split('-');
  return y && m && d ? `${d}/${m}/${y}` : ymd;
};

/** "Fri 25/12/2026" from "2026-12-25". The weekday is read in UTC, so it is the date's own. */
export const formatIsoDay = (ymd: string): string => {
  const date = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return ymd;
  const day = SHORT_DAY[date.getUTCDay()];
  return `${day} ${formatIsoDate(ymd)}`;
};
