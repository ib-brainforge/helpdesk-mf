import { useAgentUtilizationReport } from '@/components/reports/hooks/useReports';
import { useMemo } from 'react';

/**
 * How many tickets each agent currently has open, keyed by user id.
 *
 * "Open" here is the backend's definition: any status other than Closed, so New
 * plus In Progress. Taken from the agent-utilization report's `CurrentOpen`,
 * which the handler computes in its own query with no date bound, commented
 * there as "not limited to period, counts all open". That makes it a live
 * workload number rather than a figure for the reporting window.
 *
 * ONE REQUEST. The alternative was counting per user from the tickets endpoint,
 * which takes a single status at a time: two calls per agent, so fourteen for a
 * team of seven, growing with the team. This is one call that the server groups.
 *
 * WHY THE WIDE DATE RANGE
 * The report's rows are built by grouping tickets CREATED inside the requested
 * window, and `CurrentOpen` is then looked up per agent from that set. An agent
 * whose open tickets all predate the window is therefore missing from the
 * response entirely, not returned as zero. Passing a deliberately wide `from`
 * keeps everyone in the result. It costs nothing extra: the open-ticket query
 * ignores the range regardless.
 */
const WIDE_RANGE_START = '2000-01-01T00:00:00.000Z';

export const useAssigneeOpenCounts = () => {
  const { data, isLoading } = useAgentUtilizationReport(
    WIDE_RANGE_START,
    // `to` is left open so tickets created moments ago are still counted; a
    // fixed "now" would be stale the instant it was computed, and a fresh
    // Date() on every render would change the query key and refetch forever.
    undefined,
  );

  const countsByUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const agent of data ?? []) {
      if (agent.agentId) map.set(agent.agentId, agent.currentOpen);
    }
    return map;
  }, [data]);

  return { countsByUserId, isLoading };
};
