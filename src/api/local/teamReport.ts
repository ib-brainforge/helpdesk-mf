/*
 * Reports > Team (one endpoint, a principal and a tenant route).
 *
 * Built against the agreed contract before the backend lands; replace with
 * the generated client once it is regenerated. Durations are in minutes.
 * `from` and `to` are YYYY-MM-DD, both days included (the Period's month).
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

export interface TeamReportRowDto {
  /** null on the Unassigned row. */
  assigneeId: string | null;
  name: string | null;
  avatarUrl?: string | null;
  open: number;
  late: number;
  closedInPeriod: number;
  medianFirstReplyMinutes?: number | null;
  medianFixMinutes?: number | null;
}

export interface TeamReportDto {
  items: TeamReportRowDto[];
}

export interface TeamReportQuery {
  from: string;
  to: string;
  tenantIds?: string[];
  organisationIds?: string[];
}

const paramsOf = ({
  from,
  to,
  tenantIds,
  organisationIds,
}: TeamReportQuery) => ({
  from,
  to,
  tenantIds: tenantIds?.length ? tenantIds : undefined,
  organisationIds: organisationIds?.length ? organisationIds : undefined,
});

/** Principal staff: every tenant, or the ones in `tenantIds`. */
export const getTeamReport = async (
  principalId: string,
  query: TeamReportQuery,
): Promise<TeamReportDto> => {
  const { data } = await authorizedAxios.get<TeamReportDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/principals/${principalId}/reports/team`,
    // Repeated keys (tenantIds=a&tenantIds=b), not tenantIds[]=a.
    { params: paramsOf(query), paramsSerializer: { indexes: null } },
  );
  return data;
};

/** Tenant users: their own tenant, from the token. */
export const getTenantTeamReport = async (
  query: TeamReportQuery,
): Promise<TeamReportDto> => {
  const { data } = await authorizedAxios.get<TeamReportDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/reports/team`,
    {
      params: paramsOf({ ...query, tenantIds: undefined }),
      paramsSerializer: { indexes: null },
    },
  );
  return data;
};
