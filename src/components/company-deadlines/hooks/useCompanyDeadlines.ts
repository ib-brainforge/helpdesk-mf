import {
  type CompanyDeadlinePolicyDto,
  DEFAULT_POLICY_KEY,
  type SaveCompanyDeadlineResult,
  getCompanyDeadlinePolicy,
  getCompanyDeadlineSummaries,
  getHolidayRegions,
  getHolidays,
  revertCompanyDeadlinePolicy,
  saveCompanyDeadlinePolicy,
} from '@/api/local/company-deadlines';
import {
  type CompanyDeadlinePolicyInput,
  type DeadlinePriority,
  previewCompanyDeadline,
} from '@/api/local/deadlines';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { PRINCIPAL_ADMIN_ROLES } from '@/hooks/usePrincipalAccess';
import { usePermissions } from '@/security';
import {
  type QueryClient,
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { CURRENT_HOLIDAY_REGIONS } from '../holidayRegions';

export const COMPANY_DEADLINES_QUERY_KEY = 'company-deadlines';

/** Policies change rarely and only here, where a save updates the cache. */
const STALE = 60_000;

/** The shared query keys, so a page never asks twice for the same thing. */
export const deadlineKeys = {
  all: (principalId?: string) => [COMPANY_DEADLINES_QUERY_KEY, principalId],
  summaries: (principalId?: string) => [
    COMPANY_DEADLINES_QUERY_KEY,
    principalId,
    'summaries',
  ],
  policy: (principalId?: string, key?: string) => [
    COMPANY_DEADLINES_QUERY_KEY,
    principalId,
    'policy',
    key,
  ],
};

/**
 * The principal whose company deadlines are shown, and whether this user may
 * see them. Same roles as the menu item (routes/layout.tsx), read the same
 * way, so the page never disagrees with the menu.
 */
export const useDeadlinesPrincipal = () => {
  const { principalId, isLoading } = useHelpdeskAccess();
  const { hasAnyRole } = usePermissions();
  return {
    principalId,
    isAdmin: hasAnyRole([...PRINCIPAL_ADMIN_ROLES]),
    isLoading,
  };
};

export const useCompanyDeadlineSummaries = (principalId?: string) =>
  useQuery({
    queryKey: deadlineKeys.summaries(principalId),
    queryFn: () => getCompanyDeadlineSummaries(principalId as string),
    enabled: Boolean(principalId),
    staleTime: STALE,
  });

/** `key` comes from policyKey: the default, a company or an organisation. */
export const useCompanyDeadlinePolicy = (principalId?: string, key?: string) =>
  useQuery({
    queryKey: deadlineKeys.policy(principalId, key),
    queryFn: () => getCompanyDeadlinePolicy(principalId as string, key ?? ''),
    enabled: Boolean(principalId && key),
    staleTime: STALE,
  });

/**
 * After a policy at `key` changes: the list, and only the pages whose values
 * come from it (every page under the default; a tenant's organisations under
 * the tenant). Reports and, when open tickets were given new due dates, the
 * tickets follow.
 */
const invalidateAfterChange = (
  queryClient: QueryClient,
  principalId: string | undefined,
  key: string,
  ticketsChanged: boolean,
) => {
  queryClient.invalidateQueries({
    queryKey: deadlineKeys.summaries(principalId),
  });
  queryClient.invalidateQueries({
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, principalId, 'policy'],
    predicate: q => {
      const other = q.queryKey[3];
      if (typeof other !== 'string' || other === key) return false;
      if (key === DEFAULT_POLICY_KEY) return true;
      return !key.includes('/') && other.startsWith(`${key}/`);
    },
  });
  queryClient.invalidateQueries({ queryKey: ['reports'] });
  if (ticketsChanged) {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket'] });
  }
};

export const useSaveCompanyDeadlinePolicy = (
  principalId?: string,
  key?: string,
) => {
  const queryClient = useQueryClient();
  return useMutation<
    SaveCompanyDeadlineResult,
    Error,
    CompanyDeadlinePolicyInput & { applyToOpenTickets: boolean }
  >({
    mutationFn: body =>
      saveCompanyDeadlinePolicy(principalId as string, key as string, body),
    onSuccess: result => {
      // The saved policy is the new truth for this page.
      queryClient.setQueryData<CompanyDeadlinePolicyDto>(
        deadlineKeys.policy(principalId, key),
        result.policy,
      );
      invalidateAfterChange(
        queryClient,
        principalId,
        key as string,
        result.recalculatedTickets > 0,
      );
    },
  });
};

/**
 * Drops a company's or an organisation's own policy (the mutation takes a
 * policyKey), so it inherits again.
 */
export const useRevertCompanyDeadlinePolicy = (principalId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: key => revertCompanyDeadlinePolicy(principalId as string, key),
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({
        queryKey: deadlineKeys.policy(principalId, key),
      });
      invalidateAfterChange(queryClient, principalId, key, false);
    },
  });
};

/**
 * The public holidays in the next 12 months for a region, from today.
 * Loaded only when someone opens the list (two calendar years at most).
 */
export const useUpcomingHolidays = (
  principalId: string | undefined,
  region: string | null,
  enabled: boolean,
) => {
  const today = new Date();
  const year = today.getFullYear();
  const results = useQueries({
    queries: [year, year + 1].map(y => ({
      queryKey: [COMPANY_DEADLINES_QUERY_KEY, 'holidays', region, y],
      queryFn: () => getHolidays(principalId as string, region as string, y),
      enabled: enabled && Boolean(principalId && region),
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

/**
 * The holiday regions the backend counts. Until its list exists (a 404), the
 * ones it counts today: NSW, and none.
 */
export const useHolidayRegions = (principalId?: string) => {
  const query = useQuery({
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, 'holiday-regions'],
    queryFn: () => getHolidayRegions(principalId as string),
    enabled: Boolean(principalId),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  return query.data?.length ? query.data : CURRENT_HOLIDAY_REGIONS;
};

/** The value, once it has stopped changing for `ms`. */
const useDebounced = <T>(value: T, ms: number): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
};

export interface DeadlinePreviewRequest {
  tenantId: string | null;
  /** Set on an organisation's page. */
  organisationId?: string | null;
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
  principalId: string | undefined,
  request: DeadlinePreviewRequest | null,
) => {
  const body = useDebounced(request ? JSON.stringify(request) : null, 300);
  return useQuery({
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, principalId, 'preview', body],
    queryFn: () =>
      previewCompanyDeadline(
        principalId as string,
        JSON.parse(body as string) as DeadlinePreviewRequest,
      ),
    enabled: Boolean(principalId && body),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    // A draft that fails validation on the server is not worth three retries.
    retry: false,
  });
};
