import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import type { TicketFilters } from '@/types/ticket';
import { toApiTicketPriority } from '@/utils/typeMappers';
import { useQuery } from '@tanstack/react-query';
import type { TicketTabKey } from './ticketTabs';

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
 * WHY BOTH HOOKS CALL THIS RATHER THAN THE ENDPOINT DIRECTLY
 * useTicketTabCounts and useAssigneeTicketCounts both render on the tickets
 * page. They pass the same filters, so they build the same query key, and React
 * Query serves both from a single in-flight request. Two hooks, one call.
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
  assignees: { assigneeId: string; count: number }[];
  /** Tickets matching the filters with nobody assigned, in any status. */
  unassigned: number;
}

/**
 * The filters the endpoint accepts.
 *
 * status, statuses, overdueOnly and unassignedOnly are deliberately absent:
 * each tab defines those for itself server-side. Sending them would make every
 * badge depend on whichever tab happened to be open, which is the bug
 * ticketTabs.ts exists to prevent.
 */
const countsParams = (filters: TicketFilters): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  // Same shapes as ticketQueryValues/extraParams in useTickets.ts: priority and
  // category are single-valued arrays in the filter state, while the scope ids
  // are passed through whole.
  if (filters.customStatusId) params.customStatusId = filters.customStatusId;
  if (filters.priority?.[0]) {
    params.priority = toApiTicketPriority(filters.priority[0]);
  }
  if (filters.categoryId?.[0]) params.categoryId = filters.categoryId[0];
  if (filters.assigneeId?.[0]) params.assigneeId = filters.assigneeId[0];
  if (filters.searchTerm) params.searchTerm = filters.searchTerm;
  if (filters.tagIds?.length) params.tagIds = filters.tagIds;
  if (filters.tenantId) params.tenantId = filters.tenantId;
  if (filters.organisationId) params.organisationId = filters.organisationId;
  if (filters.divisionId) params.divisionId = filters.divisionId;
  return params;
};

export const useTicketCounts = (filters: TicketFilters = {}) => {
  /*
   * Same scope branch as the grid and as the hooks this replaces. Counting in
   * the tenant scope while the rows come from the principal scope is the exact
   * defect useAssigneeTicketCounts was written to stop repeating, so the
   * principal has its own counts route rather than a tenant-scoped
   * approximation.
   */
  const { isServiceAdmin, principalId } = useHelpdeskAccess();
  const scopedPrincipalId =
    isServiceAdmin && principalId ? principalId : undefined;

  const params = countsParams(filters);

  const query = useQuery({
    // Prefixed with 'tickets' so the invalidateQueries({ queryKey: ['tickets'] })
    // that every ticket mutation and every realtime event already fires reaches
    // these badges too. TanStack matches by prefix.
    queryKey: [
      'tickets',
      'counts',
      scopedPrincipalId ?? 'tenant',
      params,
    ],
    // A count that is a few seconds stale is fine; re-counting on every focus
    // change is not. This is the ceiling when nothing invalidates, not the
    // normal path.
    staleTime: 30 * 1000,
    queryFn: async (): Promise<TicketCountsResponse> => {
      const base = requireHelpdeskApiBaseUrl();
      const url = scopedPrincipalId
        ? `${base}/v1/principals/${scopedPrincipalId}/tickets/counts`
        : `${base}/v1/tickets/counts`;

      // authorizedAxios rather than the generated client: this endpoint is
      // newer than the checked-in OpenAPI spec, so helpdesk-client has no
      // method for it yet. Swap to the generated call once the client is
      // regenerated; the shape below already matches the DTO.
      const { data } = await authorizedAxios.get<TicketCountsResponse>(url, {
        params,
        // tagIds goes out as repeated `tagIds=` rather than `tagIds[0]=`,
        // matching how the ticket list serialises the same filter.
        paramsSerializer: { indexes: null },
      });
      return data;
    },
  });

  return { data: query.data, isLoading: query.isLoading };
};

/** The tab badges, in the shape the grid already expects. */
export const tabCountsFrom = (
  data: TicketCountsResponse | undefined,
  currentUserId?: string,
): Record<TicketTabKey, number> | undefined => {
  if (!data) return undefined;

  /*
   * "Assigned to you" is read off the rail, not off tabs.assignedToMe.
   *
   * The rail already carries a row per assignee, and this tab is by definition
   * that row for the signed-in user: filtersForTab('assigned-to-you') applies
   * an assignee and nothing else, which is exactly what the rail counts. An
   * assignee holding nothing is absent from the response, so a missing row is
   * a true zero.
   *
   * It also sidesteps a real gap. tabs.assignedToMe is computed server-side
   * from the caller's identity, and on the principal-scoped route that identity
   * comes back null, so the badge read 0 while the same person's rail row read
   * 179. Deriving it here is correct in both scopes and needs no server to know
   * who is asking. tabs.assignedToMe is still preferred when present, since it
   * is the same number by a shorter path.
   */
  const fromRail = currentUserId
    ? (data.assignees.find(a => a.assigneeId === currentUserId)?.count ?? 0)
    : 0;

  return {
    unanswered: data.tabs.unanswered,
    unclosed: data.tabs.unclosed,
    unassigned: data.tabs.unassigned,
    overdue: data.tabs.overdue,
    'assigned-to-you': currentUserId ? (data.tabs.assignedToMe ?? fromRail) : 0,
    all: data.tabs.all,
  };
};
