import {
  type TicketHistoryItemDto,
  getTicketHistory,
} from '@/api/local/ticket-history';
import { useHelpdeskScope } from '@/hooks/useHelpdeskScope';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const PAGE_SIZE = 20;

/**
 * Under the ticket's own key, so everything that already invalidates
 * ['ticket', id] (an edit, a reply, a tag, the realtime events) refreshes
 * History too, and nothing else has to know about it.
 */
export const ticketHistoryQueryKey = (ticketId: string) =>
  ['ticket', ticketId, 'history'] as const;

/**
 * A ticket's History, newest first, a page at a time ("Show more").
 *
 * Fetches only while `enabled` (the section is expanded), so a ticket that
 * nobody opens History on costs no request. Once loaded it stays cached, so
 * collapsing and expanding again is instant.
 */
export const useTicketHistory = (ticketId: string, enabled: boolean) => {
  const scope = useHelpdeskScope();
  const query = useInfiniteQuery({
    queryKey: ticketHistoryQueryKey(ticketId),
    queryFn: ({ pageParam }) =>
      getTicketHistory(ticketId, pageParam, PAGE_SIZE, scope),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
    enabled: enabled && !!ticketId,
    staleTime: 30 * 1000,
  });

  // A row written between two pages shifts the next page by one, so the
  // same row can arrive twice. Keep the first.
  const items = useMemo<TicketHistoryItemDto[]>(() => {
    const seen = new Set<string>();
    const out: TicketHistoryItemDto[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items ?? []) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  }, [query.data]);

  return {
    items,
    /** Unknown (undefined) until the first page has loaded. */
    totalCount: query.data?.pages[0]?.totalCount,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};
