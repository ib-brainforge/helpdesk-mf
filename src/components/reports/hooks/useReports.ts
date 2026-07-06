import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  AgentUtilizationDto,
  AssetsReportDto,
  AuditLogReportDto,
  CompanyStatisticsDto,
  CustomReportRequestDto,
  CustomReportResultDto,
  DeletedTicketDto,
  DynamicsReportDto,
  OverdueTicketDto,
  ReportGranularity,
  SlaComplianceDto,
  TechPerformanceDto,
  TicketByCategoryDto,
  TicketByPriorityDto,
  TicketByStatusDto,
  TicketSummaryReportDto,
} from '@/types';
import { ReportsApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery } from '@tanstack/react-query';

export const useTicketSummaryReport = (
  startDate?: string,
  endDate?: string,
) => {
  return useQuery<TicketSummaryReportDto>({
    queryKey: ['reports', 'summary', startDate, endDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsSummaryGet(startDate, endDate);
      // The generated SummaryReportDto and its breakdown entries expose every
      // numeric field as optional; normalise to the local TicketSummaryReportDto
      // shape (which requires count/percentage) with safe defaults.
      return {
        totalCreated: data.totalCreated ?? 0,
        totalClosed: data.totalClosed ?? 0,
        totalOpen: data.totalOpen ?? 0,
        averageResolutionTimeHours: data.averageResolutionTimeHours ?? 0,
        avgFirstResponseMinutes: data.avgFirstResponseMinutes ?? null,
        avgResolutionMinutes: data.avgResolutionMinutes ?? null,
        byStatus: (data.byStatus ?? []).map(item => ({
          status: item.status,
          name: item.name,
          count: item.count ?? 0,
          percentage: item.percentage ?? 0,
        })),
        byPriority: (data.byPriority ?? []).map(item => ({
          priority: item.priority,
          name: item.name,
          count: item.count ?? 0,
          percentage: item.percentage ?? 0,
        })),
        byCategory: (data.byCategory ?? []).map(item => ({
          category: item.category,
          name: item.name,
          count: item.count ?? 0,
          percentage: item.percentage ?? 0,
        })),
        byTechnician: (data.byTechnician ?? []).map(item => ({
          technician: item.technician,
          name: item.name,
          count: item.count ?? 0,
          percentage: item.percentage ?? 0,
        })),
        fromDate: data.fromDate ?? null,
        toDate: data.toDate ?? null,
      };
    },
  });
};

export const useDynamicsReport = (
  startDate: string,
  endDate: string,
  granularity: ReportGranularity,
) => {
  return useQuery<DynamicsReportDto>({
    queryKey: ['reports', 'dynamics', startDate, endDate, granularity],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      // REVIEW: Granularity type may need conversion to generated enum
      const { data } = await client.v1ReportsDynamicsGet(
        startDate,
        endDate,
        granularity as any,
      );
      return data as unknown as DynamicsReportDto;
    },
  });
};

export const useTechPerformanceReport = (
  startDate?: string,
  endDate?: string,
) => {
  return useQuery<TechPerformanceDto[]>({
    queryKey: ['reports', 'tech-performance', startDate, endDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTechPerformanceGet(
        startDate,
        endDate,
      );
      return data as TechPerformanceDto[];
    },
  });
};

export const useCustomReport = () => {
  return useMutation({
    mutationFn: async (request: CustomReportRequestDto) => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsCustomPost(request as any);
      // REVIEW: Type mapping from generated types to local types
      return data as unknown as CustomReportResultDto;
    },
  });
};

export const useExportReport = () => {
  return useMutation({
    mutationFn: async (params: {
      reportType: 'summary' | 'dynamics' | 'custom';
      format: 'csv' | 'excel';
      data: unknown;
    }) => {
      const client = await createHelpdeskApiClient(ReportsApi);
      // REVIEW: Export endpoint format TBD - using generic approach
      const { data } = await client.v1ReportsExportPost(params as any);
      return data;
    },
  });
};

// ── Wave 4 report hooks ────────────────────────────────────────────────────────
// These hooks call the new Wave 4 endpoints added in helpdesk-backend PR #56.
// Method names follow the OpenAPI generator typescript-axios naming convention:
//   v1Reports{EndpointCamelCase}Get

export const useOverdueTicketsReport = (fromDate?: string, toDate?: string) => {
  return useQuery<OverdueTicketDto[]>({
    queryKey: ['reports', 'overdue-tickets', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsOverdueTicketsGet(
        fromDate,
        toDate,
      );
      return (data ?? []).map(item => ({
        id: item.id ?? '',
        subject: item.subject ?? '',
        assigneeId: item.assigneeId ?? null,
        priority: item.priority ?? '',
        daysOverdue: item.daysOverdue ?? 0,
        createdAt: item.createdAt ?? '',
        dueDate: item.dueDate ?? '',
        status: item.status ?? '',
      }));
    },
  });
};

export const useTicketsByCategoryReport = (
  fromDate?: string,
  toDate?: string,
) => {
  return useQuery<TicketByCategoryDto[]>({
    queryKey: ['reports', 'tickets-by-category', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTicketsByCategoryGet(
        fromDate,
        toDate,
      );
      return (data ?? []).map(item => ({
        categoryId: item.categoryId ?? null,
        categoryName: item.categoryName ?? '',
        total: item.total ?? 0,
        byStatus: item.byStatus ?? {},
      }));
    },
  });
};

export const useTicketsByPriorityReport = (
  fromDate?: string,
  toDate?: string,
) => {
  return useQuery<TicketByPriorityDto[]>({
    queryKey: ['reports', 'tickets-by-priority', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTicketsByPriorityGet(
        fromDate,
        toDate,
      );
      return (data ?? []).map(item => ({
        priority: item.priority ?? '',
        total: item.total ?? 0,
        byStatus: item.byStatus ?? {},
      }));
    },
  });
};

export const useTicketsByStatusReport = (
  fromDate?: string,
  toDate?: string,
) => {
  return useQuery<TicketByStatusDto[]>({
    queryKey: ['reports', 'tickets-by-status', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTicketsByStatusGet(
        fromDate,
        toDate,
      );
      return (data ?? []).map(item => ({
        status: item.status ?? '',
        total: item.total ?? 0,
        byPriority: item.byPriority ?? {},
      }));
    },
  });
};

export const useSlaComplianceReport = (
  fromDate?: string,
  toDate?: string,
  policyId?: string,
) => {
  return useQuery<SlaComplianceDto>({
    queryKey: ['reports', 'sla-compliance', fromDate, toDate, policyId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsSlaComplianceGet(
        fromDate,
        toDate,
        policyId,
      );
      return {
        fromDate: data.fromDate ?? '',
        toDate: data.toDate ?? '',
        totalTickets: data.totalTickets ?? 0,
        withinSla: data.withinSla ?? 0,
        breachedSla: data.breachedSla ?? 0,
        compliancePercentage: data.compliancePercentage ?? 0,
        byPolicy: (data.byPolicy ?? []).map(p => ({
          policyId: p.policyId ?? '',
          policyName: p.policyName ?? '',
          totalBreaches: p.totalBreaches ?? 0,
          responseBreaches: p.responseBreaches ?? 0,
          resolutionBreaches: p.resolutionBreaches ?? 0,
        })),
      };
    },
  });
};

export const useCompanyStatisticsReport = (
  fromDate?: string,
  toDate?: string,
) => {
  return useQuery<CompanyStatisticsDto>({
    queryKey: ['reports', 'company-statistics', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsCompanyStatisticsGet(
        fromDate,
        toDate,
      );
      return {
        fromDate: data.fromDate ?? '',
        toDate: data.toDate ?? '',
        totalTickets: data.totalTickets ?? 0,
        openTickets: data.openTickets ?? 0,
        closedTickets: data.closedTickets ?? 0,
        avgResolutionMinutes: data.avgResolutionMinutes ?? null,
        avgFirstResponseMinutes: data.avgFirstResponseMinutes ?? null,
        topCategories: (data.topCategories ?? []).map(c => ({
          categoryId: c.categoryId ?? '',
          categoryName: c.categoryName ?? '',
          ticketCount: c.ticketCount ?? 0,
        })),
        topAssignees: (data.topAssignees ?? []).map(a => ({
          assigneeId: a.assigneeId ?? '',
          ticketCount: a.ticketCount ?? 0,
          resolvedCount: a.resolvedCount ?? 0,
        })),
      };
    },
  });
};

export const useAgentUtilizationReport = (
  fromDate?: string,
  toDate?: string,
) => {
  return useQuery<AgentUtilizationDto[]>({
    queryKey: ['reports', 'agent-utilization', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsAgentUtilizationGet(
        fromDate,
        toDate,
      );
      return (data ?? []).map(item => ({
        agentId: item.agentId ?? '',
        ticketsAssigned: item.ticketsAssigned ?? 0,
        ticketsResolved: item.ticketsResolved ?? 0,
        currentOpen: item.currentOpen ?? 0,
        avgResolutionMinutes: item.avgResolutionMinutes ?? null,
        fromDate: item.fromDate ?? '',
        toDate: item.toDate ?? '',
      }));
    },
  });
};

export const useDeletedTicketsReport = (fromDate?: string, toDate?: string) => {
  return useQuery<DeletedTicketDto[]>({
    queryKey: ['reports', 'deleted-tickets', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsDeletedTicketsGet(
        fromDate,
        toDate,
      );
      return (data ?? []).map(item => ({
        id: item.id ?? '',
        subject: item.subject ?? '',
        entityType: item.entityType ?? '',
        deletedByUserId: item.deletedByUserId ?? '',
        deletedAt: item.deletedAt ?? '',
        reason: item.reason ?? null,
        entityDescription: item.entityDescription ?? null,
      }));
    },
  });
};

export const useAuditLogReport = (params: {
  fromDate?: string;
  toDate?: string;
  userId?: string;
  eventType?: string;
  page?: number;
  pageSize?: number;
}) => {
  return useQuery<AuditLogReportDto>({
    queryKey: ['reports', 'audit-log', params],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsAuditLogGet(
        params.fromDate,
        params.toDate,
        params.userId,
        params.eventType,
        params.page ?? 1,
        params.pageSize ?? 50,
      );
      return {
        items: (data.items ?? []).map(item => ({
          id: item.id ?? '',
          entityType: item.entityType ?? '',
          entityId: item.entityId ?? '',
          entityDescription: item.entityDescription ?? null,
          actorUserId: item.actorUserId ?? '',
          occurredAt: item.occurredAt ?? '',
          reason: item.reason ?? null,
        })),
        totalCount: data.totalCount ?? 0,
        page: data.page ?? 1,
        pageSize: data.pageSize ?? 50,
        totalPages: data.totalPages ?? 0,
      };
    },
  });
};

export const useAssetsReport = (fromDate?: string, toDate?: string) => {
  return useQuery<AssetsReportDto[]>({
    queryKey: ['reports', 'assets', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsAssetsGet(fromDate, toDate);
      return (data ?? []).map(item => ({
        assetId: item.assetId ?? '',
        ticketCount: item.ticketCount ?? 0,
        tickets: (item.tickets ?? []).map(t => ({
          ticketId: t.ticketId ?? '',
          subject: t.subject ?? '',
          status: t.status ?? '',
          priority: t.priority ?? '',
          assigneeId: t.assigneeId ?? null,
          createdAt: t.createdAt ?? '',
        })),
      }));
    },
  });
};
