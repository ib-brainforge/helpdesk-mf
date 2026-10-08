import {
  type KpiQuery,
  getKpiReport,
  getTenantKpiReport,
} from '@/api/local/kpi';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/**
 * The KPI report for a month, every company or one. Netcorp staff read the
 * principal route (all companies); anyone else reads their own company's.
 * Switching tabs and back does not refetch, and changing a filter keeps the
 * last figures on screen until the new ones land.
 */
export const useKpiReport = (
  principalId: string | undefined,
  query: KpiQuery,
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: [
      'reports',
      'kpi',
      principalId ?? 'tenant',
      query.month,
      query.tenantId ?? null,
      query.organisationId ?? null,
    ],
    queryFn: () =>
      principalId
        ? getKpiReport(principalId, query)
        : getTenantKpiReport(query),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
