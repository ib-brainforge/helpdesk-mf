import { useQuery, useMutation } from '@tanstack/react-query';
import { ReportsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  TicketSummaryReportDto,
  DynamicsReportDto,
  TechPerformanceDto,
  ReportGranularity,
  CustomReportRequestDto,
  CustomReportResultDto,
  OverdueTicketDto,
  TicketByCategoryDto,
  TicketByPriorityDto,
  TicketByStatusDto,
  SlaComplianceDto,
  CompanyStatisticsDto,
  AgentUtilizationDto,
  DeletedTicketDto,
  AuditLogReportDto,
  AssetsReportDto,
} from '@/types';

export const useTicketSummaryReport = (startDate?: string, endDate?: string) => {
  return useQuery<TicketSummaryReportDto>({
    queryKey: ['reports', 'summary', startDate, endDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsSummaryGet(startDate, endDate);
      // REVIEW: Type mapping from generated types to local types
      return (data as unknown) as TicketSummaryReportDto;
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
      const { data } = await client.v1ReportsDynamicsGet(startDate, endDate, granularity as any);
      return (data as unknown) as DynamicsReportDto;
    },
  });
};

export const useTechPerformanceReport = (startDate?: string, endDate?: string) => {
  return useQuery<TechPerformanceDto[]>({
    queryKey: ['reports', 'tech-performance', startDate, endDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTechPerformanceGet(startDate, endDate);
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
      const { data } = await client.v1ReportsOverdueTicketsGet(fromDate, toDate);
      return (data as unknown) as OverdueTicketDto[];
    },
  });
};

export const useTicketsByCategoryReport = (fromDate?: string, toDate?: string) => {
  return useQuery<TicketByCategoryDto[]>({
    queryKey: ['reports', 'tickets-by-category', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTicketsByCategoryGet(fromDate, toDate);
      return (data as unknown) as TicketByCategoryDto[];
    },
  });
};

export const useTicketsByPriorityReport = (fromDate?: string, toDate?: string) => {
  return useQuery<TicketByPriorityDto[]>({
    queryKey: ['reports', 'tickets-by-priority', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTicketsByPriorityGet(fromDate, toDate);
      return (data as unknown) as TicketByPriorityDto[];
    },
  });
};

export const useTicketsByStatusReport = (fromDate?: string, toDate?: string) => {
  return useQuery<TicketByStatusDto[]>({
    queryKey: ['reports', 'tickets-by-status', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTicketsByStatusGet(fromDate, toDate);
      return (data as unknown) as TicketByStatusDto[];
    },
  });
};

export const useSlaComplianceReport = (fromDate?: string, toDate?: string, policyId?: string) => {
  return useQuery<SlaComplianceDto>({
    queryKey: ['reports', 'sla-compliance', fromDate, toDate, policyId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsSlaComplianceGet(fromDate, toDate, policyId);
      return (data as unknown) as SlaComplianceDto;
    },
  });
};

export const useCompanyStatisticsReport = (fromDate?: string, toDate?: string) => {
  return useQuery<CompanyStatisticsDto>({
    queryKey: ['reports', 'company-statistics', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsCompanyStatisticsGet(fromDate, toDate);
      return (data as unknown) as CompanyStatisticsDto;
    },
  });
};

export const useAgentUtilizationReport = (fromDate?: string, toDate?: string) => {
  return useQuery<AgentUtilizationDto[]>({
    queryKey: ['reports', 'agent-utilization', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsAgentUtilizationGet(fromDate, toDate);
      return (data as unknown) as AgentUtilizationDto[];
    },
  });
};

export const useDeletedTicketsReport = (fromDate?: string, toDate?: string) => {
  return useQuery<DeletedTicketDto[]>({
    queryKey: ['reports', 'deleted-tickets', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsDeletedTicketsGet(fromDate, toDate);
      return (data as unknown) as DeletedTicketDto[];
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
      return (data as unknown) as AuditLogReportDto;
    },
  });
};

export const useAssetsReport = (fromDate?: string, toDate?: string) => {
  return useQuery<AssetsReportDto[]>({
    queryKey: ['reports', 'assets', fromDate, toDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsAssetsGet(fromDate, toDate);
      return (data as unknown) as AssetsReportDto[];
    },
  });
};
