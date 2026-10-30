import { type KpiQuery, getTenantKpiReport } from '@/api/local/kpi';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/**
 * The KPI report for a month, for the tenant the user is working in.
 * Switching tabs and back does not refetch, and changing a filter keeps the
 * last figures on screen until the new ones land.
 */
export const useKpiReport = (
  query: KpiQuery,
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: ['reports', 'kpi', query.month, query.organisationId ?? null],
    queryFn: () => getTenantKpiReport(query),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
