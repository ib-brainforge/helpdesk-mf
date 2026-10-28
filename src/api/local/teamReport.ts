/*
 * Reports > Team.
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
  organisationIds?: string[];
}

/** The caller's own tenant, from the token. */
export const getTeamReport = async ({
  from,
  to,
  organisationIds,
}: TeamReportQuery): Promise<TeamReportDto> => {
  const { data } = await authorizedAxios.get<TeamReportDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/reports/team`,
    {
      params: {
        from,
        to,
        organisationIds: organisationIds?.length ? organisationIds : undefined,
      },
      // Repeated keys (organisationIds=a&organisationIds=b), not organisationIds[]=a.
      paramsSerializer: { indexes: null },
    },
  );
  return data;
};
