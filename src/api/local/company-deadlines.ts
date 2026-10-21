/*
 * Company deadline policies (Configuration > Company Deadlines).
 *
 * Replace with the generated client once it is regenerated: these endpoints
 * are newer than the checked-in OpenAPI spec. The shapes mirror the backend
 * DTOs exactly (design-review/notes/dev/CONTRACTS.md, Cara's section). Every
 * duration is in minutes. The policy input type and the preview call live in
 * ./deadlines.ts, the one client for deadlines, and are not repeated here.
 *
 * The lists (tenants, and a tenant's organisations) are paged, filtered and
 * sorted on the server and carry names, since there are hundreds of tenants.
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import type {
  CompanyDeadlinePolicyInput,
  DeadlinePolicySource,
  DeadlinePriority,
} from './deadlines';

/**
 * One way a policy differs from the one it would otherwise use: a tenant's
 * from the default, an organisation's from its tenant's. Sent by the list
 * endpoints (only the differences, so a row says what is custom and nothing
 * else) and worked out the same way on a policy page by resolveDeadlines.
 */
export type DeadlineDifferenceDto =
  | {
      field: 'reply' | 'fix';
      priority: DeadlinePriority;
      value: number;
      inherited: number;
    }
  | {
      /** The clock mode and the open days and hours, together. */
      field: 'hours';
      value: Pick<CompanyDeadlinePolicyInput, 'clockMode' | 'days'>;
      inherited: Pick<CompanyDeadlinePolicyInput, 'clockMode' | 'days'>;
    }
  | { field: 'timeZone'; value: string; inherited: string }
  | {
      /** Region codes ("NSW"), null for none. */
      field: 'holidays';
      value: string | null;
      inherited: string | null;
    };

export interface ClosedDayDto {
  /** YYYY-MM-DD */
  date: string;
  name: string;
}

/**
 * One policy page: the default, a company or an organisation. The policy
 * fields are the EFFECTIVE values (an organisation without its own shows its
 * company's, and so on), so an inheriting page can show them read-only.
 */
export interface CompanyDeadlinePolicyDto extends CompanyDeadlinePolicyInput {
  /** Null for the principal default. */
  tenantId: string | null;
  /** Set on an organisation's page only. */
  organisationId: string | null;
  policyId: string | null;
  /** Whether THIS page has its own policy rather than inheriting one. */
  isCustom: boolean;
  /** Where the effective values come from. */
  source: DeadlinePolicySource;
  /** Company page: its organisations that have their own policy. Otherwise []. */
  customOrganisationIds: string[];
  /** The open tickets this page's "apply to open tickets" would recalculate. */
  inheritingOpenTickets: number;
  openTickets: number;
  lateTickets: number;
  nextClosedDay: ClosedDayDto | null;
  closedDaysThisYear: number;
}

export interface SaveCompanyDeadlineResult {
  policy: CompanyDeadlinePolicyDto;
  recalculatedTickets: number;
}

/** The route segment for one policy: a tenant id, or "default". */
export const DEFAULT_POLICY_KEY = 'default';

/**
 * The path below .../company-deadlines/ for one policy, which every call here
 * takes as its `key`: "default", a tenant id, or a tenant id and one of its
 * organisations.
 */
export const policyKey = (
  tenantId: string | null,
  organisationId?: string | null,
): string => {
  if (!tenantId) return DEFAULT_POLICY_KEY;
  return organisationId
    ? `${tenantId}/organisations/${organisationId}`
    : tenantId;
};

const base = (principalId: string) =>
  `${requireHelpdeskApiBaseUrl()}/v1/principals/${principalId}/company-deadlines`;

/** A page of a list endpoint. */
export interface PagedDto<T> {
  items: T[];
  /** Rows matching the filters, across every page. */
  total: number;
}

export type DeadlineListSort = 'name' | 'open' | 'late';

/** What every deadlines list takes. `page` is 1-based; `pageSize` at most 100. */
export interface DeadlineListParams {
  search?: string;
  /** Only rows with deadlines of their own. */
  custom?: boolean;
  /** Only rows with late open tickets. */
  hasLate?: boolean;
  sort?: DeadlineListSort;
  dir?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface TenantDeadlineListParams extends DeadlineListParams {
  /** Only tenants with at least one organisation of deadlines of its own. */
  hasCustomOrgs?: boolean;
}

/** One row of the tenants list: what differs from the default, and its tickets. */
export interface TenantDeadlineRowDto {
  tenantId: string;
  name: string;
  isCustom: boolean;
  /** Empty when it uses the default, or its own policy matches it. */
  differences: DeadlineDifferenceDto[];
  orgCount: number;
  customOrgCount: number;
  open: number;
  late: number;
}

/** One row of a tenant's organisations: what differs from the tenant's deadlines. */
export interface OrganisationDeadlineRowDto {
  organisationId: string;
  name: string;
  isCustom: boolean;
  differences: DeadlineDifferenceDto[];
  open: number;
  late: number;
}

/** The query string for a list: only what is set, so defaults stay off the wire. */
const listQuery = (params: TenantDeadlineListParams) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== false && v !== '',
    ),
  );

/** Every tenant, a page at a time, filtered and sorted on the server. */
export const getTenantDeadlines = async (
  principalId: string,
  params: TenantDeadlineListParams,
): Promise<PagedDto<TenantDeadlineRowDto>> => {
  const { data } = await authorizedAxios.get<PagedDto<TenantDeadlineRowDto>>(
    base(principalId),
    { params: listQuery(params) },
  );
  return data ?? { items: [], total: 0 };
};

/** One tenant's organisations, a page at a time. */
export const getOrganisationDeadlines = async (
  principalId: string,
  tenantId: string,
  params: DeadlineListParams,
): Promise<PagedDto<OrganisationDeadlineRowDto>> => {
  const { data } = await authorizedAxios.get<
    PagedDto<OrganisationDeadlineRowDto>
  >(`${base(principalId)}/${tenantId}/organisations`, {
    params: listQuery(params),
  });
  return data ?? { items: [], total: 0 };
};

/** `key` comes from policyKey. */
export const getCompanyDeadlinePolicy = async (
  principalId: string,
  key: string,
): Promise<CompanyDeadlinePolicyDto> => {
  const { data } = await authorizedAxios.get<CompanyDeadlinePolicyDto>(
    `${base(principalId)}/${key}`,
  );
  return data;
};

export const saveCompanyDeadlinePolicy = async (
  principalId: string,
  key: string,
  body: CompanyDeadlinePolicyInput & { applyToOpenTickets: boolean },
): Promise<SaveCompanyDeadlineResult> => {
  const { data } = await authorizedAxios.put<SaveCompanyDeadlineResult>(
    `${base(principalId)}/${key}`,
    body,
  );
  return data;
};

/**
 * Drops a company's or an organisation's own policy (`key` from policyKey),
 * so it inherits again: a company the default, an organisation its company.
 * 404 when it had none.
 */
export const revertCompanyDeadlinePolicy = async (
  principalId: string,
  key: string,
): Promise<void> => {
  await authorizedAxios.delete(`${base(principalId)}/${key}`);
};

/** `region` is a holiday region code ("NSW"); the calendar is its "AU-" form. */
export const getHolidays = async (
  principalId: string,
  region: string,
  year: number,
): Promise<ClosedDayDto[]> => {
  const { data } = await authorizedAxios.get<ClosedDayDto[]>(
    `${base(principalId)}/holidays`,
    { params: { calendar: `AU-${region}`, region, year } },
  );
  return data ?? [];
};

export interface HolidayRegionDto {
  /** "NSW" */
  code: string;
  /** "New South Wales" */
  name: string;
}

/** The holiday regions the backend can count. Being added by the backend. */
export const getHolidayRegions = async (
  principalId: string,
): Promise<HolidayRegionDto[]> => {
  const { data } = await authorizedAxios.get<HolidayRegionDto[]>(
    `${base(principalId)}/holiday-regions`,
  );
  return data ?? [];
};
