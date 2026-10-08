import { formatDateTimeAmPm } from '@/components/shared';
import { useScopeNames } from '@/hooks/useScopeNames';
import { type UserInfo, useUserEnrichment } from '@/hooks/useUserEnrichment';
import { Icon } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { useTimezone } from '@brainforgeau/security';
import { type FC, useMemo, useRef, useState } from 'react';
import { useTicketHistory } from '../hooks/useTicketHistory';
import {
  type HistoryNameLookup,
  describeHistoryEvent,
} from '../ticket-history-events';

/** Detail keys that hold a user id, resolved with the actors in one batch. */
const USER_DETAIL_KEYS = ['fromUserId', 'toUserId'] as const;

/** Shown while a name is still being looked up. */
const PENDING_NAME = '...';

export interface TicketHistoryProps {
  ticketId: string;
}

/**
 * The ticket's one History: status, priority, assignment, assets, emails and
 * the rest, newest first.
 *
 * Collapsed by default and fetched only when opened, since most visits never
 * look. Then 20 rows at a time with "Show more". The conversation above is
 * for messages; this is for who changed what.
 */
export const TicketHistory: FC<TicketHistoryProps> = ({ ticketId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timezone = useTimezone();
  const {
    items,
    totalCount,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTicketHistory(ticketId, isOpen);

  // Every actor and every user named in a row, in one identity request.
  const userIds = useMemo(() => {
    const ids: string[] = [];
    for (const item of items) {
      if (item.actorUserId) ids.push(item.actorUserId);
      for (const key of USER_DETAIL_KEYS) {
        const id = item.details?.[key];
        if (id) ids.push(id);
      }
    }
    return ids;
  }, [items]);
  const { userMap, isLoading: usersLoading } = useUserEnrichment(userIds);

  // "Show more" adds ids, which is a new lookup. Keep showing the names
  // already known while it loads rather than blanking every row.
  const knownUsers = useRef<Record<string, UserInfo | null>>(userMap);
  if (!usersLoading) knownUsers.current = userMap;
  const users = usersLoading ? knownUsers.current : userMap;

  // Cached from the page's company pills, so no extra request.
  const scopeNames = useScopeNames();

  const names = useMemo<HistoryNameLookup>(
    () => ({
      user: id => (id in users ? users[id]?.name : PENDING_NAME),
      company: id => scopeNames.byTenantId.get(id)?.tenantName,
      organisation: id => scopeNames.byOrganisationId.get(id),
      dateTime: iso => formatDateTimeAmPm(iso, timezone),
    }),
    [users, scopeNames, timezone],
  );

  const actorName = (actorUserId: string | null): string => {
    if (!actorUserId) return 'System';
    if (!(actorUserId in users)) return PENDING_NAME;
    return users[actorUserId]?.name ?? 'Former user';
  };

  return (
    <Box>
      <h3 className="text-sm font-semibold">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="ticket-history-list"
          onClick={() => setIsOpen(open => !open)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span>
            History
            {totalCount !== undefined && totalCount > 0 && (
              <span className="ml-1.5 font-normal text-default-400">
                {totalCount}
              </span>
            )}
          </span>
          <Icon
            name={isOpen ? 'ChevronDownIcon' : 'ChevronRightIcon'}
            className="h-4 w-4 text-default-400"
            aria-hidden="true"
          />
        </button>
      </h3>

      {isOpen && (
        <div id="ticket-history-list" className="mt-3">
          {isLoading ? (
            <p className="text-sm text-default-400">Loading history...</p>
          ) : isError ? (
            <p className="text-sm text-default-500">
              History could not be loaded.{' '}
              <button
                type="button"
                onClick={() => refetch()}
                className="text-blue-600 hover:underline"
              >
                Try again
              </button>
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-default-400 italic">No history yet.</p>
          ) : (
            <ol className="space-y-3">
              {items.map(item => {
                const view = describeHistoryEvent(item, names);
                return (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-default-100">
                      <Icon
                        name={view.icon}
                        className="h-3.5 w-3.5 text-default-600"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm break-words">{view.text}</p>
                      <p className="text-xs text-default-500">
                        {actorName(item.actorUserId)},{' '}
                        <time dateTime={item.occurredAt}>
                          {formatDateTimeAmPm(item.occurredAt, timezone)}
                        </time>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {hasNextPage && !isLoading && !isError && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-40"
            >
              {isFetchingNextPage ? 'Loading...' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </Box>
  );
};
