import type { TicketFilters } from '@/types/ticket';
import type { TicketTabKey } from './ticketTabs';
import { tabCountsFrom, useTicketCounts } from './useTicketCounts';

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
   * All six badges now come from one request, shared with the assignee rail.
   *
   * This used to issue one request per tab, and the rail one per person: about
   * fifteen calls per page load to return fifteen integers. useTicketCounts
   * explains what that cost and why the server answers it in a single grouped
   * query instead. Both hooks pass the same filters and so build the same query
   * key, which is what makes React Query serve them from one call.
   *
   * The tab-owned fields are still stripped here. Each tab defines status,
   * unassignedOnly and overdueOnly for itself server-side, so sending them
   * would make every badge depend on whichever tab happened to be open.
   */
  const {
    status: _status,
    unassignedOnly: _unassignedOnly,
    overdueOnly: _overdueOnly,
    ...base
  } = filters;

  const { data, isLoading } = useTicketCounts(base);

  return { counts: tabCountsFrom(data, currentUserId), isLoading };
};

