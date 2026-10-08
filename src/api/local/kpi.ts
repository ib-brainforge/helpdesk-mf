/*
 * The KPI report behind Reports > Overview (one endpoint).
 *
 * Replace with the generated client once it is regenerated: this endpoint is
 * newer than the checked-in OpenAPI spec. The shapes mirror the backend DTOs
 * exactly (design-review/notes/dev/CONTRACTS.md, Cara's section). Durations
 * are in minutes, percentages are 0 to 100, dates are YYYY-MM-DD and instants
 * ISO UTC. Ids only: names come from contexts, identity and the category list.
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import type { DeadlinePriority } from './deadlines';

export interface KpiCardsDto {
  deadlineMetPct: number | null;
  deadlineTargetPct: number;
  avgFirstReplyMinutes: number | null;
  lateReplies: number;
  avgFixMinutes: number | null;
  lateFixes: number;
  openTickets: number;
  overdueNow: number;
  cameBackPct: number | null;
  cameBackCount: number;
  closedCount: number;
  csatAverage: number | null;
  csatSurveys: number;
}

export interface KpiWeekDto {
  /** YYYY-MM-DD */
  weekStart: string;
  deadlineMetPct: number | null;
  ticketCount: number;
}

export interface KpiCompanyRowDto {
  tenantId: string;
  tickets: number;
  deadlineMetPct: number | null;
  avgFirstReplyMinutes: number | null;
  avgFixMinutes: number | null;
  cameBackPct: number | null;
  csatAverage: number | null;
  openNow: number;
  lateNow: number;
}

export interface KpiLateItemDto {
  ticketId: string;
  subject: string;
  categoryId: string | null;
  organisationId: string | null;
  priority: DeadlinePriority;
  missed: 'Reply' | 'Fix';
  lateByMinutes: number;
  assigneeId: string | null;
}

export interface KpiPolicySummaryDto {
  clockMode: 'BusinessHours' | 'AllHours';
  hoursText: string;
  targets: {
    priority: DeadlinePriority;
    replyMinutes: number;
    fixMinutes: number;
  }[];
}

export interface KpiReportDto {
  period: { from: string; to: string };
  previousPeriod: { from: string; to: string };
  cards: KpiCardsDto;
  previous: KpiCardsDto | null;
  /** Always 13 weeks, oldest first. */
  weekly: KpiWeekDto[];
  openByAge: {
    under2Days: number;
    days2To7: number;
    days8To30: number;
    over30Days: number;
    oldest: { ticketId: string; tenantId: string; ageDays: number } | null;
  };
  /** Every company, worst deadline record first. Null when a company is chosen. */
  companies: KpiCompanyRowDto[] | null;
  /** The chosen company's saved policy. */
  policySummary: KpiPolicySummaryDto | null;
  /** The chosen company's late tickets, most late first, at most 50. */
  late: {
    missedCount: number;
    totalCount: number;
    items: KpiLateItemDto[];
  } | null;
}

export interface KpiQuery {
  /** YYYY-MM, a Sydney calendar month. */
  month: string;
  tenantId?: string | null;
  organisationId?: string | null;
}

/** Principal staff: every company, or one with `tenantId`. */
export const getKpiReport = async (
  principalId: string,
  { month, tenantId, organisationId }: KpiQuery,
): Promise<KpiReportDto> => {
  const { data } = await authorizedAxios.get<KpiReportDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/principals/${principalId}/reports/kpi`,
    {
      params: {
        month,
        tenantId: tenantId || undefined,
        organisationId: organisationId || undefined,
      },
    },
  );
  return data;
};

/** Tenant users: their own company, from the token. No companies list. */
export const getTenantKpiReport = async ({
  month,
  organisationId,
}: KpiQuery): Promise<KpiReportDto> => {
  const { data } = await authorizedAxios.get<KpiReportDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/reports/kpi`,
    { params: { month, organisationId: organisationId || undefined } },
  );
  return data;
};
