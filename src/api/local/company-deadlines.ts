/*
 * A provider's tenant deadline policies (Provider view > Tenant Deadlines),
 * through the generated client. The generated DTOs leave every field optional;
 * these concrete shapes are what the editor works with, filled in once here.
 * Every duration is in minutes.
 */
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationSlaDTOsCompanyDeadlinePolicyDto as GeneratedPolicy,
  type HelpdeskApplicationSlaDTOsDeadlinePreviewDto,
  ProviderCompanyDeadlinesApi,
} from '@brainforgeau/helpdesk-client';
import type { DeadlinePriority } from './deadlines';

export type ClockMode = 'BusinessHours' | 'AllHours';

/** The editable part of a policy, as it goes to the save and preview calls. */
export interface CompanyDeadlinePolicyInput {
  clockMode: ClockMode;
  /** IANA zone, e.g. "Australia/Sydney". */
  timeZoneId: string;
  /** A holiday region code ("NSW"), null for none. */
  holidayRegion: string | null;
  /** Exactly 7, 0 = Sunday. Times are "HH:mm". */
  days: { dayOfWeek: number; isOpen: boolean; start: string; end: string }[];
  /** Exactly 4, fix >= reply > 0. */
  targets: {
    priority: DeadlinePriority;
    replyMinutes: number;
    fixMinutes: number;
  }[];
}

export interface ClosedDayDto {
  /** YYYY-MM-DD */
  date: string;
  name: string;
}

/**
 * One tenant's deadlines. The policy fields are the EFFECTIVE values: a
 * tenant without its own shows the provider default, so the page can read
 * them before anyone sets its own.
 */
export interface CompanyDeadlinePolicyDto extends CompanyDeadlinePolicyInput {
  tenantId: string;
  /** Whether the tenant has its own policy rather than the default. */
  isCustom: boolean;
  openTickets: number;
  lateTickets: number;
  nextClosedDay: ClosedDayDto | null;
  closedDaysThisYear: number;
}

export interface SaveCompanyDeadlineResult {
  policy: CompanyDeadlinePolicyDto;
  recalculatedTickets: number;
}

export interface HolidayRegionDto {
  /** "NSW" */
  code: string;
  /** "New South Wales" */
  name: string;
}

export interface TenantDeadlineRowDto {
  tenantId: string;
  name: string;
  isCustom: boolean;
  open: number;
  late: number;
}

export interface TenantDeadlinePage {
  items: TenantDeadlineRowDto[];
  /** Rows matching the filters, across every page. */
  total: number;
}

export type TenantDeadlineSort = 'name' | 'open' | 'late';

/** `page` is 1-based; `pageSize` at most 100. */
export interface TenantDeadlineParams {
  search?: string;
  /** Only tenants with deadlines of their own. */
  custom?: boolean;
  /** Only tenants with late open tickets. */
  hasLate?: boolean;
  sort?: TenantDeadlineSort;
  dir?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

const toPolicy = (p: GeneratedPolicy): CompanyDeadlinePolicyDto => ({
  tenantId: p.tenantId ?? '',
  clockMode: p.clockMode ?? 'BusinessHours',
  timeZoneId: p.timeZoneId ?? 'Australia/Sydney',
  holidayRegion: p.holidayRegion ?? null,
  days: (p.days ?? []).map(d => ({
    dayOfWeek: d.dayOfWeek ?? 0,
    isOpen: d.isOpen ?? false,
    start: d.start ?? '08:00',
    end: d.end ?? '17:30',
  })),
  targets: (p.targets ?? []).map(t => ({
    priority: (t.priority ?? 'Normal') as DeadlinePriority,
    replyMinutes: t.replyMinutes ?? 0,
    fixMinutes: t.fixMinutes ?? 0,
  })),
  isCustom: p.isCustom ?? false,
  openTickets: p.openTickets ?? 0,
  lateTickets: p.lateTickets ?? 0,
  nextClosedDay: p.nextClosedDay
    ? { date: p.nextClosedDay.date ?? '', name: p.nextClosedDay.name ?? '' }
    : null,
  closedDaysThisYear: p.closedDaysThisYear ?? 0,
});

const client = () => createHelpdeskApiClient(ProviderCompanyDeadlinesApi);

/** Every tenant, a page at a time, filtered and sorted on the server. */
export const getTenantDeadlines = async (
  p: TenantDeadlineParams,
): Promise<TenantDeadlinePage> => {
  const { data } = await (await client()).v1ProviderSupportCompanyDeadlinesGet(
    p.search || undefined,
    p.custom || undefined,
    p.hasLate || undefined,
    p.sort,
    p.dir,
    p.page,
    p.pageSize,
  );
  return {
    items: (data.items ?? []).map(r => ({
      tenantId: r.tenantId ?? '',
      name: r.name ?? '',
      isCustom: r.isCustom ?? false,
      open: r.open ?? 0,
      late: r.late ?? 0,
    })),
    total: data.total ?? 0,
  };
};

export const getCompanyDeadlinePolicy = async (
  tenantId: string,
): Promise<CompanyDeadlinePolicyDto> => {
  const { data } = await (
    await client()
  ).v1ProviderSupportCompanyDeadlinesTenantIdGet(tenantId);
  return toPolicy(data);
};

export const saveCompanyDeadlinePolicy = async (
  tenantId: string,
  body: CompanyDeadlinePolicyInput & { applyToOpenTickets: boolean },
): Promise<SaveCompanyDeadlineResult> => {
  const { data } = await (
    await client()
  ).v1ProviderSupportCompanyDeadlinesTenantIdPut(tenantId, body);
  return {
    policy: toPolicy(data.policy),
    recalculatedTickets: data.recalculatedTickets ?? 0,
  };
};

/** Drops the tenant's own policy, so it uses the provider default again. */
export const revertCompanyDeadlinePolicy = async (
  tenantId: string,
): Promise<void> => {
  await (await client()).v1ProviderSupportCompanyDeadlinesTenantIdDelete(
    tenantId,
  );
};

/** The deadlines a ticket would get under the policy as drafted, unsaved. */
export const previewCompanyDeadline = async (
  tenantId: string,
  body: {
    priority: DeadlinePriority;
    startAt: string;
    draft: CompanyDeadlinePolicyInput;
  },
): Promise<HelpdeskApplicationSlaDTOsDeadlinePreviewDto> => {
  const { data } = await (
    await client()
  ).v1ProviderSupportCompanyDeadlinesTenantIdPreviewPost(tenantId, body);
  return data;
};

/** `region` is a holiday region code ("NSW"). */
export const getHolidays = async (
  region: string,
  year: number,
): Promise<ClosedDayDto[]> => {
  const { data } = await (
    await client()
  ).v1ProviderSupportCompanyDeadlinesHolidaysGet(region, year);
  return (data ?? []).map(h => ({ date: h.date ?? '', name: h.name ?? '' }));
};

/** The holiday regions the backend can count. */
export const getHolidayRegions = async (): Promise<HolidayRegionDto[]> => {
  const { data } = await (
    await client()
  ).v1ProviderSupportCompanyDeadlinesHolidayRegionsGet();
  return (data ?? []).map(r => ({ code: r.code ?? '', name: r.name ?? '' }));
};
