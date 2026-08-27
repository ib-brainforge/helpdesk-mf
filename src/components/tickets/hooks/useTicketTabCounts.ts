import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { TicketStatus } from '@/types/ticket';
import { toApiTicketStatus } from '@/utils/typeMappers';
import { TicketsApi } from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';

/** Tab keys, matching TICKET_VALID_TABS in TicketGrid. */
export type TicketTabKey =
  | 'unanswered'
  | 'unclosed'
  | 'unassigned'
  | 'overdue'
  | 'assigned-to-you'
  | 'all';

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
 * paged envelope. The row itself is discarded; the count is the point. Six
 * fixed requests, not a fan-out that grows with the data, and they run in
 * parallel under a single React Query entry so the whole set is cached and
 * refetched together.
 *
 * The filters below MUST mirror handleTabChange in TicketGrid. If a tab's
 * definition changes there and not here, the badge quietly disagrees with the
 * list it labels.
 */
export const useTicketTabCounts = (currentUserId?: string) => {
  const query = useQuery({
    queryKey: ['ticket-tab-counts', currentUserId],
    // A count that is a few seconds stale is fine; re-counting on every focus
    // change is not.
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Record<TicketTabKey, number>> => {
      const client = await createHelpdeskApiClient(TicketsApi);

      /** Reads only totalCount; pageSize 1 keeps the payload to one row. */
      const countOf = async (
        args: {
          status?: TicketStatus;
          assigneeId?: string;
          unassignedOnly?: boolean;
          overdueOnly?: boolean;
        } = {},
      ) => {
        const response = await client.v1TicketsGet(
          args.status ? toApiTicketStatus(args.status) : undefined,
          undefined, // customStatusId
          undefined, // priority
          undefined, // categoryId
          args.assigneeId,
          undefined, // requesterId
          undefined, // searchTerm
          undefined, // unreadOnly
          args.overdueOnly ? true : undefined,
          undefined, // spamOnly
          args.unassignedOnly ? true : undefined,
          1, // page
          1, // pageSize
        );
        return response.data.totalCount ?? 0;
      };

      // Five requests, not six: Unanswered and the New half of Unclosed are the
      // same query, so it is counted once and used twice.
      const [newCount, inProgress, unassigned, overdue, all, mine] =
        await Promise.all([
          countOf({ status: TicketStatus.New }),
          countOf({ status: TicketStatus.InProgress }),
          countOf({ unassignedOnly: true }),
          countOf({ overdueOnly: true }),
          countOf(),
          currentUserId
            ? countOf({ assigneeId: currentUserId })
            : Promise.resolve(0),
        ]);

      return {
        // The backend has no "unanswered" status; New is the proxy the tab
        // filter uses, so the count has to use the same proxy.
        unanswered: newCount,
        // The endpoint takes a single status, and Unclosed means New OR
        // In Progress, so it is the sum of the two rather than its own query.
        unclosed: newCount + inProgress,
        unassigned,
        overdue,
        'assigned-to-you': mine,
        all,
      };
    },
  });

  return { counts: query.data, isLoading: query.isLoading };
};
