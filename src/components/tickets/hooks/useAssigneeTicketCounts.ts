import { useAgentUtilizationReport } from '@/components/reports/hooks/useReports';
import type { TicketFilters } from '@/types/ticket';
import { useMemo } from 'react';
import { useTicketCounts } from './useTicketCounts';

/**
 * How many tickets each agent holds, keyed by user id.
 *
 * WHY NOT THE REPORT'S OWN NUMBERS
 * This used to read `CurrentOpen` off the agent-utilization report, which was
 * one request and looked like the obvious source. It produced a rail that
 * disagreed with every tab above it, on two axes at once:
 *
 *   - CurrentOpen excludes Closed, so it is a workload figure, not a total.
 *   - The report handler is hardcoded to `t.TenantId == tenantId`, so it only
 *     ever counts the CURRENT tenant, while the grid and the tab badges read
 *     the principal scope for a service admin.
 *
 * Zeljko showed 113 in the rail beside an All tab reading 189: 113 was his open
 * work in Netcorp alone, 142 was his open work across the principal, and 189
 * was his real total. Three different questions, one of which nobody asked.
 * `TicketsAssigned` would have fixed only the first axis and still read 151.
 *
 * WHAT IT COSTS
 * One count request per agent in the roster, against the same
 * `fetchTicketCount` the tab badges use. That is the point: identical scope,
 * identical filters, identical endpoint, so the rail figure IS the All badge
 * for that person by construction rather than by a comment asking someone to
 * keep two queries in step. pageSize is 1 and only `totalCount` is read, and
 * the roster is the handful of people who hold work, not the whole directory.
 *
 * KNOWN LIMIT: THE ROSTER, NOT THE COUNTS
 * The list of agents still comes from the tenant-scoped report, so it names
 * only people with tickets in the current tenant. Their counts are now
 * principal-wide and correct, but an agent whose work sits entirely in another
 * tenant under the principal is absent from the rail altogether. Fixing that
 * needs a principal-scoped roster the backend does not expose yet:
 * PrincipalReportsController has ticket-volume and nothing else.
 */
const WIDE_RANGE_START = '2000-01-01T00:00:00.000Z';

export const useAssigneeTicketCounts = (base: TicketFilters = {}) => {
  /*
   * The roster only. See the note above: the report is used for WHO holds work,
   * never for HOW MUCH any more.
   *
   * The wide `from` is still required. The report groups tickets CREATED inside
   * the window, so an agent whose tickets all predate it drops out of the
   * response entirely rather than coming back as zero.
   */
  const { data: agents, isLoading: isLoadingRoster } =
    useAgentUtilizationReport(WIDE_RANGE_START, undefined);

  // The tenant/principal scope branch now lives in useTicketCounts, so the
  // counts still come from the same scope the grid reads without this hook
  // having its own copy of the rule.
  const agentIds = (agents ?? [])
    .map(agent => agent.agentId)
    .filter((id): id is string => Boolean(id));

  /*
   * Only the tab-owned fields are dropped here, and a selected assignee is
   * deliberately KEPT.
   *
   * That looks wrong for a rail where each row counts its own person, and it
   * used to be stripped for exactly that reason. The server now drops it for
   * the rail and applies it only to the tab badges, so the rail is unaffected
   * either way. Passing it through is what lets this hook and
   * useTicketTabCounts build an identical query key, which is what makes React
   * Query serve both from ONE request instead of two.
   */
  const {
    status: _status,
    unassignedOnly: _unassignedOnly,
    overdueOnly: _overdueOnly,
    ...carried
  } = base;

  const { data, isLoading } = useTicketCounts(carried);

  /*
   * The roster still decides WHO appears; the endpoint decides how many.
   *
   * The response only names people who currently hold a matching ticket, so
   * driving the list from it would silently drop an agent whose queue is empty.
   * Keeping the roster preserves the rail exactly as it was, counts included:
   * an agent absent from the response holds nothing and reads zero.
   *
   * It also leaves the KNOWN LIMIT above untouched rather than quietly changing
   * who is listed. The response does carry assignees the tenant-scoped roster
   * misses, so unioning the two would fix it, but that is a visible change to
   * the rail and belongs in its own piece of work.
   */
  const countsByUserId = useMemo(() => {
    const byId = new Map<string, number>();
    for (const row of data?.assignees ?? []) {
      byId.set(row.assigneeId, row.count);
    }
    return new Map(agentIds.map(id => [id, byId.get(id) ?? 0]));
  }, [data, agentIds]);

  return {
    countsByUserId,
    isLoading: isLoadingRoster || isLoading,
  };
};
