import { useQuery } from '@tanstack/react-query';
import { ReportsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  TicketSummaryReportDto,
  DynamicsReportDto,
  TechPerformanceReportDto,
  ReportGranularity,
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
  return useQuery({
    queryKey: ['reports', 'tech-performance', startDate, endDate],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(ReportsApi);
      const { data } = await client.v1ReportsTechPerformanceGet(startDate, endDate);
      // REVIEW: Type mapping from generated types to local types
      // Generated type returns array of TechPerformanceDto, wrapping in object for consistency
      return {
        technicians: data as unknown as TechPerformanceReportDto['technicians'],
      };
    },
  });
};
