import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import type { TicketFilters } from '@/types/ticket';
import { toApiTicketPriority } from '@/utils/typeMappers';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { TicketTabKey } from './ticketTabs';
import { useSearchMatches } from './useSearchMatches';
import { assigneeParams, putIds, withSearchMatches } from './useTickets';

/**
 * Every badge on the ticket list, from one request.
 *
 * WHAT THIS REPLACES
 * The tab badges and the assignee rail each counted themselves, one request per
 * badge and one per person: about fifteen calls per page load, each paying TLS,
 * JWT validation and user-context population to return a single integer.
 * Measured on dev that was an eighteen-request burst inside one second.
 *
 * None of that cost was the database. One filtered count runs in 2.8ms against
 * the indexed ticket table; every number together as one grouped query runs in
 * 1.6ms. The expense was the round trips, so the fix is to stop making them.
 * Locally the fan-out measured 76-382ms and this measures 18-35ms.
 *
 * WHY THE HOOKS CALL THIS RATHER THAN THE ENDPOINT DIRECTLY
 * useTicketTabCounts and useScopedAssignees both render on the tickets page.
 * When they pass the same filters they build the same query key, and React
 * Query serves both from a single in-flight request.
 *
 * WHY THE COUNTS ARE INTERNALLY CONSISTENT
 * The server answers from a single GROUP BY, so every number comes from one
 * database snapshot. The rail adds up to the All badge exactly, even while
 * other people are reassigning tickets underneath. The old fan-out could not
 * promise that: fifteen requests meant fifteen snapshots spread over the best
 * part of a second.
 */

export interface TicketCountsResponse {
  tabs: {
    unanswered: number;
    unclosed: number;
    unassigned: number;
    overdue: number;
    /** Null when the caller has no user id, so the tab can be hidden rather than read zero. */
    assignedToMe: number | null;
    all: number;
  };
  assignees: {
    assigneeId: string;
    /** Matching tickets in any status. */
    count: number;
    /** Matching tickets still open (New or In Progress): the work left. */
    openCount: number;
  }[];
  /** Tickets matching the filters with nobody assigned, in any status. */
  unassigned: number;
}

/**
 * The filters the endpoint accepts.
 *
 * status, statuses, custom statuses and overdueOnly are deliberately absent:
 * each tab defines those for itself server-side. Sending them would make every
 * badge depend on whichever tab happened to be open, which is the bug
 * ticketTabs.ts exists to prevent.
 */
const countsParams = (filters: TicketFilters): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  // Same shapes as ticketQueryValues/extraParams in useTickets.ts: priority is
  // a single-valued array in the filter state; category, company and
  // organisation are multi-selects (putIds).
  if (filters.priority?.[0]) {
    params.priority = toApiTicketPriority(filters.priority[0]);
  }
  putIds(params, 'categoryId', 'categoryIds', filters.categoryId);
  // The Assignee filter's selection, in the same shape the list sends.
  const assignees = assigneeParams(filters);
  if (assignees.assigneeId) params.assigneeId = assignees.assigneeId;
  if (assignees.assigneeIds) params.assigneeIds = assignees.assigneeIds;
  if (assignees.includeUnassigned) params.includeUnassigned = true;
  if (filters.searchTerm) params.searchTerm = filters.searchTerm;
  // Name matches for the search box, resolved by useSearchMatches.
  if (filters.searchUserIds?.length)
    params.searchUserIds = filters.searchUserIds;
  if (filters.searchScopeIds?.length) {
    params.searchScopeIds = filters.searchScopeIds;
  }
  if (filters.tagIds?.length) params.tagIds = filters.tagIds;
  putIds(params, 'tenantId', 'tenantIds', filters.tenantId);
  putIds(params, 'organisationId', 'organisationIds', filters.organisationId);
  if (filters.divisionId) params.divisionId = filters.divisionId;
  return params;
};

/**
 * The counts query for one set of filters, as options rather than a hook.
 *
 * Exported so a caller that needs counts for SEVERAL scopes at once (the bulk
 * assignee picker intersects one per selected organisation) can pass these to
 * useQueries and share the exact cache entries useTicketCounts reads, instead
 * of a second copy of the key and fetch that could drift from this one.
 */
export const ticketCountsQueryOptions = (
  filters: TicketFilters,
  scopedPrincipalId: string | undefined,
) => {
  const params = countsParams(filters);
  return {
    // Prefixed with 'tickets' so the invalidateQueries({ queryKey: ['tickets'] })
    // that every ticket mutation and every realtime event already fires reaches
    // these badges too. TanStack matches by prefix.
    queryKey: ['tickets', 'counts', scopedPrincipalId ?? 'tenant', params],
    // A count that is a few seconds stale is fine; re-counting on every focus
    // change is not. This is the ceiling when nothing invalidates, not the
    // normal path.
    staleTime: 30 * 1000,
    queryFn: async (): Promise<TicketCountsResponse> => {
      const base = requireHelpdeskApiBaseUrl();
      const url = scopedPrincipalId
        ? `${base}/v1/principals/${scopedPrincipalId}/tickets/counts`
        : `${base}/v1/tickets/counts`;

      // authorizedAxios rather than the generated v1TicketsCountsGet: the
      // regenerated client predates the multi-select filters sent here
      // (categoryIds, assigneeIds, includeUnassigned, tenantIds,
      // organisationIds) and the assignees' openCount. Swap to the generated
      // call once it declares them.
      const { data } = await authorizedAxios.get<TicketCountsResponse>(url, {
        params,
        // tagIds and assigneeIds go out as repeated `tagIds=` rather than
        // `tagIds[0]=`, matching how the ticket list serialises them.
        paramsSerializer: { indexes: null },
      });
      return data;
    },
  };
};

/**
 * Whether counts read the principal route, and for which principal. The same
 * rule the grid uses, so a badge and the rows beneath it always come from the
 * same population.
 */
export const useCountsPrincipal = (): string | undefined => {
  const { isServiceAdmin, principalId } = useHelpdeskAccess();
  return isServiceAdmin && principalId ? principalId : undefined;
};

export const useTicketCounts = (filters: TicketFilters = {}) => {
  /*
   * Same scope branch as the grid and as the hooks this replaces. Counting in
   * the tenant scope while the rows come from the principal scope is the exact
   * defect the old assignee rail's counts were written to stop repeating, so the
   * principal has its own counts route rather than a tenant-scoped
   * approximation.
   */
  const scopedPrincipalId = useCountsPrincipal();
  // Same name matching as the grid, so a badge counts exactly the rows the
  // search lists.
  const search = useSearchMatches(filters.searchTerm);
  const searched = useMemo(
    () => withSearchMatches(filters, search.userIds, search.scopeIds),
    [filters, search.userIds, search.scopeIds],
  );
  const query = useQuery({
    ...ticketCountsQueryOptions(searched, scopedPrincipalId),
    enabled: search.ready,
    // The badges keep their numbers while a changed filter is recounted,
    // rather than vanishing and reappearing on every tick of the Assignee
    // filter.
    placeholderData: keepPreviousData,
  });

  return { data: query.data, isLoading: query.isLoading };
};

/** The tab badges, in the shape the grid already expects. */
export const tabCountsFrom = (
  data: TicketCountsResponse | undefined,
  currentUserId?: string,
): Record<TicketTabKey, number> | undefined => {
  if (!data) return undefined;
  return {
    // Your OPEN tickets: your row in the assignee rail, the same number the
    // Assignee filter shows beside your name. tabs.assignedToMe counted
    // closed ones too (181 against 118 open).
    'assigned-to-you': currentUserId
      ? (data.assignees.find(a => a.assigneeId === currentUserId)?.openCount ??
        0)
      : 0,
    unanswered: data.tabs.unanswered,
    unclosed: data.tabs.unclosed,
    overdue: data.tabs.overdue,
    all: data.tabs.all,
  };
};
