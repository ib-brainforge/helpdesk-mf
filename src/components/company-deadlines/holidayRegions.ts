import type { HolidayRegionDto } from '@/api/local/company-deadlines';
import type { CompanyDeadlinePolicyInput } from '@/api/local/deadlines';
import { TIME_ZONES } from '@/components/shared/deadline';

/*
 * Public holiday regions: the state whose holidays the business clock skips.
 * The backend owns the list (GET .../holiday-regions) and the picker offers
 * exactly what it returns, plus "No public holidays". Until that endpoint
 * lands the backend counts NSW only, so only NSW is offered: a VIC the
 * backend cannot count would be saved and silently not skipped.
 */

/** Every Australian region, for names, in the order the backend offers them. */
export const ALL_HOLIDAY_REGIONS: HolidayRegionDto[] = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
];

/** "New South Wales" for "NSW"; the code itself for one not listed here. */
export const regionName = (code: string): string =>
  ALL_HOLIDAY_REGIONS.find(r => r.code === code)?.name ?? code;

/** What the backend counts today, before the regions list exists. */
export const CURRENT_HOLIDAY_REGIONS: HolidayRegionDto[] = [
  ALL_HOLIDAY_REGIONS[0],
];

/** A policy's region: holidayRegion, or the older holidayCalendar ("AU-NSW"). */
export const regionOf = (
  policy: Pick<CompanyDeadlinePolicyInput, 'holidayCalendar' | 'holidayRegion'>,
): string | null => {
  if (policy.holidayRegion !== undefined) return policy.holidayRegion ?? null;
  const calendar = policy.holidayCalendar;
  return calendar?.startsWith('AU-') ? calendar.slice(3) : null;
};

/** Both fields, so a save is right before and after the backend change. */
export const regionFields = (region: string | null) => ({
  holidayRegion: region,
  holidayCalendar: region ? `AU-${region}` : null,
});

/**
 * The region a time zone suggests ("Australia/Melbourne" is VIC). The
 * organisation's own state is not known to Helpdesk yet, so the time zone is
 * the best guess.
 */
export const regionForTimeZone = (timeZoneId: string): string | null =>
  TIME_ZONES.find(z => z.id === timeZoneId)?.region ?? null;
