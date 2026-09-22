import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import type { TicketFilters } from '@/types/ticket';
import { useQuery } from '@tanstack/react-query';
import {
  TICKET_TAB_KEYS,
  type TicketTabKey,
  filtersForTab,
} from './ticketTabs';
import { fetchTicketCount } from './useTickets';

export type { TicketTabKey };

/**
 * Counts for the badge on each ticket tab.
 *
 * WHY NOT THE STATS ENDPOINT
 * GET /v1/tickets/stats looks like the obvious source and carries four of the
 * six numbers (TotalUnanswered, TotalUnassigned, TotalOverdue, TotalNew), but
 * it reads a maintained snapshot row rather than counting, and its handler
 * returns all zeros when no snapshot exists for the tenant. It also has no
 * equivalent of "assigned to me" or a grand total. Badges reading 0 on a queue
 * of 2,000 tickets are worse than no badges, so these are counted live.
 *
 * HOW
 * One request per tab, asking for pageSize 1 and reading `totalCount` off the
 * paged envelope. Six fixed requests, not a fan-out that grows with the data,
 * and they run in parallel under a single React Query entry so the whole set is
 * cached and refetched together.
 *
 * EVERY BADGE IS SCOPED BY THE ACTIVE FILTERS
 * `filters` is whatever the sidebar and filter bar have selected. Each count is
 * that selection plus its own tab's definition, taken from the same
 * `filtersForTab` the grid uses, so a badge always describes the list you get
 * by clicking it. Without this, choosing an assignee narrowed the rows to that
 * person while all six badges carried on reporting the whole queue.
 *
 * The tab-owned fields (status, unassignedOnly, overdueOnly) are stripped
 * before the key is built, so switching tabs does not invalidate the counts:
 * the six numbers do not depend on which tab is currently open.
 */
export const useTicketTabCounts = (
  currentUserId?: string,
  filters: TicketFilters = {},
) => {
  /*
   * Same branch as useTicketsData. The counts must come from the endpoint the
   * rows come from, or they describe a different population: a service admin
   * reads the principal scope, everyone else the tenant scope.
   */
  const { isServiceAdmin, principalId } = useHelpdeskAccess();
  const scopedPrincipalId =
    isServiceAdmin && principalId ? principalId : undefined;

  const {
    status: _status,
    unassignedOnly: _unassignedOnly,
    overdueOnly: _overdueOnly,
    ...base
  } = filters;

  const query = useQuery({
    queryKey: [
      'ticket-tab-counts',
      currentUserId,
      scopedPrincipalId ?? 'tenant',
      base,
    ],
    // A count that is a few seconds stale is fine; re-counting on every focus
    // change is not.
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Record<TicketTabKey, number>> => {
      const counts = await Promise.all(
        TICKET_TAB_KEYS.map(key =>
          fetchTicketCount(
            filtersForTab(key, base, currentUserId),
            scopedPrincipalId,
          ),
        ),
      );

      return Object.fromEntries(
        TICKET_TAB_KEYS.map((key, i) => [key, counts[i]]),
      ) as Record<TicketTabKey, number>;
    },
  });

  return { counts: query.data, isLoading: query.isLoading };
};
