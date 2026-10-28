/*
 * The form model for a tenant's deadline policy, and the few display helpers
 * only these pages need.
 *
 * Wording (targets, hours, the clock, time zones) is shared/deadline's
 * deadlineText and is not repeated here. Nothing here works out a deadline:
 * the backend does, and the worked example asks it.
 */
import type { CompanyDeadlinePolicyInput } from '@/api/local/company-deadlines';
import type { DeadlinePriority } from '@/api/local/deadlines';
import {
  DAY_ORDER,
  TIME_ZONES,
  timeZoneLabel,
} from '@/components/shared/deadline';
import { z } from 'zod';
import { regionOf } from './holidayRegions';

export const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

/** Critical first, the way every deadlines page lists them. */
export const PRIORITIES: DeadlinePriority[] = [
  'Critical',
  'High',
  'Normal',
  'Low',
];

/** The form's value for "no public holidays" (null on the wire). */
export const NO_HOLIDAYS = 'NONE';

/** A new policy's holidays, before anyone picks. */
export const DEFAULT_HOLIDAY_REGION = 'NSW';

/** The zones offered, plus the current one if it is not among them. */
export const timeZoneOptions = (current: string) => {
  const ids: string[] = TIME_ZONES.map(z => z.id);
  if (current && !ids.includes(current)) ids.unshift(current);
  return ids.map(id => ({ id, label: timeZoneLabel(id) }));
};

/** Every half hour, as "HH:mm". */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

// ── Form model ──────────────────────────────────────────────────────────────

const daySchema = z.object({
  dayOfWeek: z.number(),
  isOpen: z.boolean(),
  start: z.string(),
  end: z.string(),
});

const targetSchema = z.object({
  priority: z.enum(['Critical', 'High', 'Normal', 'Low']),
  replyMinutes: z.number({ invalid_type_error: 'Enter a time' }),
  fixMinutes: z.number({ invalid_type_error: 'Enter a time' }),
});

/** The server validates the same rules; these give the message beside the field. */
export const policyFormSchema = z
  .object({
    clockMode: z.enum(['BusinessHours', 'AllHours']),
    timeZoneId: z.string().min(1),
    /** A region code ("NSW"), or NO_HOLIDAYS. */
    holidayRegion: z.string(),
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
          message: 'At least the reply time',
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
  holidayRegion: policy
    ? (regionOf(policy) ?? NO_HOLIDAYS)
    : DEFAULT_HOLIDAY_REGION,
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
  holidayRegion: v.holidayRegion === NO_HOLIDAYS ? null : v.holidayRegion,
  days: v.days.map(d => ({ ...d })),
  targets: v.targets.map(t => ({ ...t })),
});

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "05/10/2026" from "2026-10-05", without going through a Date and a time zone. */
const formatIsoDate = (ymd: string): string => {
  const [y, m, d] = ymd.split('-');
  return y && m && d ? `${d}/${m}/${y}` : ymd;
};

/** "Fri 25/12/2026" from "2026-12-25". The weekday is read in UTC, so it is the date's own. */
export const formatIsoDay = (ymd: string): string => {
  const date = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return ymd;
  return `${SHORT_DAY[date.getUTCDay()]} ${formatIsoDate(ymd)}`;
};
