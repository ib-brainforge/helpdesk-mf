import type { TicketFilters } from '@/types/ticket';
import { useMemo } from 'react';
import type { TicketTabKey } from './ticketTabs';
import { tabCountsFrom, useTicketCounts } from './useTicketCounts';

export type { TicketTabKey };

/**
 * Tickets per person for the Assignee filter's badges, from the same response
 * as the tab badges: how many each person has LEFT. Each counts that person's
 * open tickets (New or In Progress, as the Unclosed tab means it) under the
 * other active filters (company, organisation, category, priority, tags,
 * search), in the list's own scope: the number the list shows on Unclosed with
 * only that person ticked. The selected assignees never narrow it.
 */
export interface AssigneeCounts {
  byId: ReadonlyMap<string, number>;
  /** Open tickets with nobody assigned, on the same terms: the Unassigned tab's badge. */
  unassigned: number;
}

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
 * The tab-owned fields (status, overdueOnly) are stripped
 * before the key is built, so switching tabs does not invalidate the counts:
 * the six numbers do not depend on which tab is currently open.
 */
export const useTicketTabCounts = (filters: TicketFilters = {}) => {
  /*
   * All six badges now come from one request, shared with the assignee rail.
   *
   * This used to issue one request per tab, and the rail one per person: about
   * fifteen calls per page load to return fifteen integers. useTicketCounts
   * explains what that cost and why the server answers it in a single grouped
   * query instead. Both hooks pass the same filters and so build the same query
   * key, which is what makes React Query serve them from one call.
   *
   * The tab-owned fields are still stripped here. Each tab defines status
   * and overdueOnly for itself server-side, so sending them would make every
   * badge depend on whichever tab happened to be open.
   */
  const { status: _status, overdueOnly: _overdueOnly, ...base } = filters;

  const { data, isLoading } = useTicketCounts(base);

  // The rail half of the same response, for the Assignee filter: no request of
  // its own. Someone absent from it holds no matching ticket.
  const assigneeCounts = useMemo(
    (): AssigneeCounts | undefined =>
      data
        ? {
            byId: new Map(data.assignees.map(a => [a.assigneeId, a.openCount])),
            // Open unassigned is exactly the Unassigned tab's count.
            unassigned: data.tabs.unassigned,
          }
        : undefined,
    [data],
  );

  return {
    counts: tabCountsFrom(data),
    assigneeCounts,
    isLoading,
  };
};
