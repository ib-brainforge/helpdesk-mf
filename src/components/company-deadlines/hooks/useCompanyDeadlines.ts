import {
  type CompanyDeadlinePolicyDto,
  type SaveCompanyDeadlineResult,
  getCompanyDeadlinePolicy,
  getCompanyDeadlineSummaries,
  getHolidays,
  saveCompanyDeadlinePolicy,
} from '@/api/local/company-deadlines';
import {
  type CompanyDeadlinePolicyInput,
  type DeadlinePriority,
  previewCompanyDeadline,
} from '@/api/local/deadlines';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { PRINCIPAL_ADMIN_ROLES } from '@/hooks/usePrincipalAccess';
import { usePermissions } from '@brainforgeau/security';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export const COMPANY_DEADLINES_QUERY_KEY = 'company-deadlines';

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
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, principalId, 'summaries'],
    queryFn: () => getCompanyDeadlineSummaries(principalId as string),
    enabled: Boolean(principalId),
  });

/** `key` is a tenant id or DEFAULT_POLICY_KEY. */
export const useCompanyDeadlinePolicy = (principalId?: string, key?: string) =>
  useQuery({
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, principalId, 'policy', key],
    queryFn: () => getCompanyDeadlinePolicy(principalId as string, key ?? ''),
    enabled: Boolean(principalId && key),
  });

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
      // The saved policy is the new truth for this page, and every summary
      // (the list, and any company that inherits the default) may have moved.
      queryClient.setQueryData<CompanyDeadlinePolicyDto>(
        [COMPANY_DEADLINES_QUERY_KEY, principalId, 'policy', key],
        result.policy,
      );
      queryClient.invalidateQueries({
        queryKey: [COMPANY_DEADLINES_QUERY_KEY, principalId],
      });
      // Report figures and ticket deadlines change with the policy.
      queryClient.invalidateQueries({ queryKey: ['reports', 'kpi'] });
    },
  });
};

/** Loaded only when someone opens "See all N days". */
export const useHolidays = (
  principalId: string | undefined,
  calendar: string | null,
  year: number,
  enabled: boolean,
) =>
  useQuery({
    queryKey: [COMPANY_DEADLINES_QUERY_KEY, 'holidays', calendar, year],
    queryFn: () => getHolidays(principalId as string, calendar as string, year),
    enabled: enabled && Boolean(principalId && calendar),
    staleTime: 24 * 60 * 60 * 1000,
  });

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
