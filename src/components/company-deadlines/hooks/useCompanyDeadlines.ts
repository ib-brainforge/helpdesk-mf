import {
  type CompanyDeadlinePolicyDto,
  type CompanyDeadlinePolicyInput,
  type SaveCompanyDeadlineResult,
  type TenantDeadlineParams,
  getCompanyDeadlinePolicy,
  getHolidayRegions,
  getHolidays,
  getTenantDeadlines,
  previewCompanyDeadline,
  revertCompanyDeadlinePolicy,
  saveCompanyDeadlinePolicy,
} from '@/api/local/company-deadlines';
import type { DeadlinePriority } from '@/api/local/deadlines';
import { useDebounced } from '@/hooks/useDebounced';
import {
  type QueryClient,
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export const COMPANY_DEADLINES_QUERY_KEY = 'company-deadlines';

/** Policies change rarely and only here, where a save updates the cache. */
const STALE = 60_000;

export const deadlineKeys = {
  /** Every page of the tenants list; add the params for one page. */
  tenants: () => [COMPANY_DEADLINES_QUERY_KEY, 'tenants'],
  policy: (tenantId?: string) => [
    COMPANY_DEADLINES_QUERY_KEY,
    'policy',
    tenantId,
  ],
};

/** One page of the tenants list. The last page stays on screen while the next loads. */
export const useTenantDeadlines = (params: TenantDeadlineParams) =>
  useQuery({
    queryKey: [...deadlineKeys.tenants(), params],
    queryFn: () => getTenantDeadlines(params),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });

export const useCompanyDeadlinePolicy = (tenantId?: string) =>
  useQuery({
    queryKey: deadlineKeys.policy(tenantId),
    queryFn: () => getCompanyDeadlinePolicy(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: STALE,
  });

/** After a policy changes: the list's counts, reports and, when due dates moved, the tickets. */
const invalidateAfterChange = (
  queryClient: QueryClient,
  ticketsChanged: boolean,
) => {
  queryClient.invalidateQueries({ queryKey: deadlineKeys.tenants() });
  queryClient.invalidateQueries({ queryKey: ['reports'] });
  if (ticketsChanged) {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket'] });
  }
};

export const useSaveCompanyDeadlinePolicy = (tenantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    SaveCompanyDeadlineResult,
    Error,
    CompanyDeadlinePolicyInput & { applyToOpenTickets: boolean }
  >({
    mutationFn: body => saveCompanyDeadlinePolicy(tenantId as string, body),
    onSuccess: result => {
      // The saved policy is the new truth for this page.
      queryClient.setQueryData<CompanyDeadlinePolicyDto>(
        deadlineKeys.policy(tenantId),
        result.policy,
      );
      invalidateAfterChange(queryClient, result.recalculatedTickets > 0);
    },
  });
};

/** Drops the tenant's own policy, so it uses the provider default again. */
export const useRevertCompanyDeadlinePolicy = (tenantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => revertCompanyDeadlinePolicy(tenantId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: deadlineKeys.policy(tenantId),
      });
      invalidateAfterChange(queryClient, false);
    },
  });
};

/**
 * The public holidays in the next 12 months for a region, from today.
 * Loaded only when someone opens the list (two calendar years at most).
 */
export const useUpcomingHolidays = (
  region: string | null,
  enabled: boolean,
) => {
  const today = new Date();
  const year = today.getFullYear();
  const results = useQueries({
    queries: [year, year + 1].map(y => ({
      queryKey: [COMPANY_DEADLINES_QUERY_KEY, 'holidays', region, y],
      queryFn: () => getHolidays(region as string, y),
      enabled: enabled && Boolean(region),
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });
  const from = today.toISOString().slice(0, 10);
  const until = `${year + 1}${from.slice(4)}`;
  // A dozen rows at most: cheaper to redo than to memoise.
  const days = results
    .flatMap(r => r.data ?? [])
    .filter(h => h.date >= from && h.date < until)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    days,
    isLoading: results.some(r => r.isLoading),
    isError: results.some(r => r.isError),
  };
};

/** The holiday regions the backend counts. */
export const useHolidayRegions = () => {
  const query = useQuery({
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, 'holiday-regions'],
    queryFn: getHolidayRegions,
    staleTime: 24 * 60 * 60 * 1000,
  });
  return query.data ?? [];
};

export interface DeadlinePreviewRequest {
  policy: CompanyDeadlinePolicyInput;
  priority: DeadlinePriority;
  startAt: string;
}

/**
 * The worked example: the backend's answer for the policy as it stands in the
 * form, unsaved. Asked 300 ms after the last change, and keyed on the request
 * itself, so going back to an earlier draft costs nothing. The last answer
 * stays on screen while the next one loads.
 */
export const useDeadlinePreview = (
  tenantId: string | undefined,
  request: DeadlinePreviewRequest | null,
) => {
  const body = useDebounced(request ? JSON.stringify(request) : null, 300);
  return useQuery({
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, tenantId, 'preview', body],
    queryFn: () => {
      const r = JSON.parse(body as string) as DeadlinePreviewRequest;
      return previewCompanyDeadline(tenantId as string, {
        priority: r.priority,
        startAt: r.startAt,
        draft: r.policy,
      });
    },
    enabled: Boolean(tenantId && body),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    // A draft that fails validation on the server is not worth three retries.
    retry: false,
  });
};
