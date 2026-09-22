import { useAgentUtilizationReport } from '@/components/reports/hooks/useReports';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import type { TicketFilters } from '@/types/ticket';
import { useQuery } from '@tanstack/react-query';
import { fetchTicketCount } from './useTickets';

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

  /*
   * Same branch as useTicketsData and useTicketTabCounts. Counting in the
   * tenant scope while the grid reads the principal scope is the exact defect
   * this hook exists to stop repeating.
   */
  const { isServiceAdmin, principalId } = useHelpdeskAccess();
  const scopedPrincipalId =
    isServiceAdmin && principalId ? principalId : undefined;

  const agentIds = (agents ?? [])
    .map(agent => agent.agentId)
    .filter((id): id is string => Boolean(id));

  /*
   * The tab-owned fields are dropped, and so is any assignee already chosen:
   * each row counts ITS OWN person, and picking someone must not renumber
   * everybody else in the list.
   */
  const {
    status: _status,
    unassignedOnly: _unassignedOnly,
    overdueOnly: _overdueOnly,
    assigneeId: _assigneeId,
    ...carried
  } = base;

  const { data, isLoading } = useQuery({
    queryKey: [
      'assignee-ticket-counts',
      agentIds,
      scopedPrincipalId ?? 'tenant',
      carried,
    ],
    enabled: agentIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const counts = await Promise.all(
        agentIds.map(id =>
          fetchTicketCount({ ...carried, assigneeId: [id] }, scopedPrincipalId),
        ),
      );
      return new Map(agentIds.map((id, i) => [id, counts[i]]));
    },
  });

  return {
    countsByUserId: data ?? new Map<string, number>(),
    isLoading: isLoadingRoster || isLoading,
  };
};
