import type {
  CompanyDeadlinePolicyInput,
  HolidayRegionDto,
} from '@/api/local/company-deadlines';
import { TIME_ZONES } from '@/components/shared/deadline';

/*
 * Public holiday regions: the state whose holidays the business clock skips.
 * The backend owns the list (GET .../holiday-regions) and the picker offers
 * exactly what it returns, plus "No public holidays".
 */

/** Every Australian region, for names. */
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

/** A policy's region code, null for none. */
export const regionOf = (
  policy: Pick<CompanyDeadlinePolicyInput, 'holidayRegion'>,
): string | null => policy.holidayRegion ?? null;

/**
 * The region a time zone suggests ("Australia/Melbourne" is VIC). The
 * tenant's own state is not known to Helpdesk, so the time zone is the best
 * guess.
 */
export const regionForTimeZone = (timeZoneId: string): string | null =>
  TIME_ZONES.find(z => z.id === timeZoneId)?.region ?? null;
