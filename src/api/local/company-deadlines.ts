/*
 * Company deadline policies (Configuration > Company Deadlines).
 *
 * Replace with the generated client once it is regenerated: these endpoints
 * are newer than the checked-in OpenAPI spec. The shapes mirror the backend
 * DTOs exactly (design-review/notes/dev/CONTRACTS.md, Cara's section). Every
 * duration is in minutes. The policy input type and the preview call live in
 * ./deadlines.ts, the one client for deadlines, and are not repeated here.
 *
 * Names are not sent: tenants and organisations come from contexts.
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import type { CompanyDeadlinePolicyInput } from './deadlines';

export type DeadlineClockMode = CompanyDeadlinePolicyInput['clockMode'];

/** One row of the companies list. Missing for companies with no policy and no tickets. */
export interface CompanyDeadlineSummaryDto {
  tenantId: string;
  isCustom: boolean;
  clockMode: DeadlineClockMode;
  /** "Mon to Fri, 8:00 am to 5:30 pm Sydney time." */
  hoursText: string;
  highReplyMinutes: number;
  highFixMinutes: number;
  openTickets: number;
  lateTickets: number;
}

export interface ClosedDayDto {
  /** YYYY-MM-DD */
  date: string;
  name: string;
}

export interface CompanyDeadlinePolicyDto extends CompanyDeadlinePolicyInput {
  /** Null for the principal default. */
  tenantId: string | null;
  policyId: string | null;
  /** False when the company inherits the default. */
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

/** The route segment for one policy: a tenant id, or "default". */
export const DEFAULT_POLICY_KEY = 'default';

const base = (principalId: string) =>
  `${requireHelpdeskApiBaseUrl()}/v1/principals/${principalId}/company-deadlines`;

export const getCompanyDeadlineSummaries = async (
  principalId: string,
): Promise<CompanyDeadlineSummaryDto[]> => {
  const { data } = await authorizedAxios.get<CompanyDeadlineSummaryDto[]>(
    base(principalId),
  );
  return data ?? [];
};

/** `key` is a tenant id or DEFAULT_POLICY_KEY. */
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

/** Reverts a company to the default policy. */
export const revertCompanyDeadlinePolicy = async (
  principalId: string,
  tenantId: string,
): Promise<void> => {
  await authorizedAxios.delete(`${base(principalId)}/${tenantId}`);
};

export const getHolidays = async (
  principalId: string,
  calendar: string,
  year: number,
): Promise<ClosedDayDto[]> => {
  const { data } = await authorizedAxios.get<ClosedDayDto[]>(
    `${base(principalId)}/holidays`,
    { params: { calendar, year } },
  );
  return data ?? [];
};
