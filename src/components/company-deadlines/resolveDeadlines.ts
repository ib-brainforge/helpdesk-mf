import type { DeadlineDifferenceDto } from '@/api/local/company-deadlines';
import type {
  CompanyDeadlinePolicyInput,
  DeadlinePolicySource,
  DeadlinePriority,
} from '@/api/local/deadlines';
import {
  describeClock,
  describeHours,
  formatMinutes,
  holidaysText,
  timeZoneCity,
} from '@/components/shared/deadline';
import { PRIORITIES } from './deadlinePolicy';
import { regionOf } from './holidayRegions';

/*
 * THE resolver for "which deadlines apply here, where they come from, and
 * what is different about them".
 *
 * An organisation's own deadlines win over its tenant's, which win over the
 * default. A policy is whole: every value of an inheriting page comes from
 * the same place. The differences are the same shape the list endpoints send
 * (DeadlineDifferenceDto), and describeDifference words both, so a list row
 * and a policy page cannot disagree about what is custom.
 */

type Policy = CompanyDeadlinePolicyInput;

export interface ResolvedRow {
  priority: DeadlinePriority;
  replyMinutes: number;
  fixMinutes: number;
  /** Reply or fix differs from what it would inherit. */
  differs: boolean;
}

export interface ResolvedDeadlines {
  /** Its own policy, rather than its parent's. */
  hasOwn: boolean;
  /** Where it inherits from, or would: "Remondis", "default". */
  fromName: string;
  clockMode: Policy['clockMode'];
  /** Critical first. */
  rows: ResolvedRow[];
  /** The whole clock in one line. */
  clock: string;
  clockDiffers: boolean;
  /** Empty for an inheriting page, an identical copy, and the default. */
  differences: DeadlineDifferenceDto[];
}

/** Where an inheriting page's values come from, as a name. */
export const sourceName = (
  source: DeadlinePolicySource,
  names: { tenant?: string | null },
): string =>
  source === 'Company' ? (names.tenant ?? 'the tenant') : 'default';

const sameDays = (a: Policy['days'], b: Policy['days']) =>
  a.length === b.length &&
  a.every(d => {
    const o = b.find(x => x.dayOfWeek === d.dayOfWeek);
    return (
      o &&
      o.isOpen === d.isOpen &&
      (!d.isOpen || (o.start === d.start && o.end === d.end))
    );
  });

/** What `own` changes from `inherited`, in the list endpoints' shape. */
const diffPolicies = (
  own: Policy,
  inherited: Policy,
): DeadlineDifferenceDto[] => {
  const out: DeadlineDifferenceDto[] = [];
  for (const priority of PRIORITIES) {
    const t = own.targets.find(x => x.priority === priority);
    const i = inherited.targets.find(x => x.priority === priority);
    if (!t || !i) continue;
    if (t.replyMinutes !== i.replyMinutes)
      out.push({
        field: 'reply',
        priority,
        value: t.replyMinutes,
        inherited: i.replyMinutes,
      });
    if (t.fixMinutes !== i.fixMinutes)
      out.push({
        field: 'fix',
        priority,
        value: t.fixMinutes,
        inherited: i.fixMinutes,
      });
  }
  if (
    own.clockMode !== inherited.clockMode ||
    (own.clockMode === 'BusinessHours' && !sameDays(own.days, inherited.days))
  )
    out.push({
      field: 'hours',
      value: { clockMode: own.clockMode, days: own.days },
      inherited: { clockMode: inherited.clockMode, days: inherited.days },
    });
  if (own.timeZoneId !== inherited.timeZoneId)
    out.push({
      field: 'timeZone',
      value: own.timeZoneId,
      inherited: inherited.timeZoneId,
    });
  // Holidays only count on business hours.
  const region = regionOf(own);
  const inheritedRegion = regionOf(inherited);
  if (own.clockMode === 'BusinessHours' && region !== inheritedRegion)
    out.push({ field: 'holidays', value: region, inherited: inheritedRegion });
  return out;
};

/** The words for one difference: a label, the value here, and the inherited one. */
export const describeDifference = (
  d: DeadlineDifferenceDto,
): { label: string; value: string; inherited: string } => {
  switch (d.field) {
    case 'reply':
    case 'fix':
      return {
        label: `${d.priority} ${d.field}`,
        value: formatMinutes(d.value),
        inherited: formatMinutes(d.inherited),
      };
    case 'hours':
      return {
        label: 'Hours',
        value: describeHours(d.value),
        inherited: describeHours(d.inherited),
      };
    case 'timeZone':
      return {
        label: 'Time zone',
        value: timeZoneCity(d.value),
        inherited: timeZoneCity(d.inherited),
      };
    case 'holidays':
      return {
        label: 'Holidays',
        value: holidaysText(d.value),
        inherited: holidaysText(d.inherited),
      };
  }
};

const clockOf = (p: Policy): string =>
  describeClock({ ...p, holidayRegion: regionOf(p) });

export const resolveDeadlines = ({
  values,
  hasOwn,
  inherited,
  fromName,
}: {
  /** The values in force here. */
  values: Policy;
  hasOwn: boolean;
  /** What it would use without its own; null for the default or not loaded. */
  inherited: Policy | null;
  fromName: string;
}): ResolvedDeadlines => {
  const differences =
    hasOwn && inherited ? diffPolicies(values, inherited) : [];
  return {
    hasOwn,
    fromName,
    clockMode: values.clockMode,
    rows: PRIORITIES.flatMap(priority => {
      const t = values.targets.find(x => x.priority === priority);
      return t
        ? [
            {
              priority,
              replyMinutes: t.replyMinutes,
              fixMinutes: t.fixMinutes,
              differs: differences.some(
                d =>
                  (d.field === 'reply' || d.field === 'fix') &&
                  d.priority === priority,
              ),
            },
          ]
        : [];
    }),
    clock: clockOf(values),
    clockDiffers: differences.some(
      d =>
        d.field === 'hours' || d.field === 'timeZone' || d.field === 'holidays',
    ),
    differences,
  };
};
