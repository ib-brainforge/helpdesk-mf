import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { TicketFilters } from '@/types/ticket';
import { Spinner } from '@heroui/react';
import { type FC, useMemo } from 'react';
import { useAssigneeTicketCounts } from '../hooks/useAssigneeTicketCounts';

/**
 * The assignee quick-filter, as a sidebar list.
 *
 * WHAT IT CARRIES OVER FROM V3
 * A person, their open count, one click to their queue. That is the whole
 * affordance, and it is the one thing agents used the v3 rail for.
 *
 * WHAT IT DROPS
 * v3's colour coding. The tile colour there encoded nothing a reader could
 * name, and colour in v5 means status and priority. The count is the signal.
 *
 * WHY A COLUMN RATHER THAN A ROW
 * A horizontal row of tiles grows into a second and third line as the team
 * grows, pushing the grid down the page. A column scrolls inside the sidebar
 * and costs the table nothing.
 *
 * WHAT THE NUMBER MEANS
 * Every ticket that person holds, not just their open ones, counted in the
 * same scope and against the same endpoint as the tabs above the grid. Click a
 * person and their row's number is what the All tab then reads. It used to be
 * the report's open-in-this-tenant figure, which agreed with nothing on the
 * page: see useAssigneeTicketCounts for the three-way mismatch that caused.
 *
 * This is now the ONLY way to filter by assignee. The toolbar autocomplete
 * that used to sit beside the other filters has been removed.
 */

interface Props {
  /** Currently filtered assignee, or undefined for everyone. */
  value?: string;
  onChange: (assigneeId?: string) => void;
  /**
   * The rest of the active filters, so each person's number counts the same
   * population the grid would show for them.
   */
  filters?: TicketFilters;
}

export const AssigneeFilterList: FC<Props> = ({
  value,
  onChange,
  filters = {},
}) => {
  const { countsByUserId, isLoading } = useAssigneeTicketCounts(filters);

  /*
   * Busiest first, and only people who actually hold tickets. Someone with
   * nothing is not a queue anyone needs to look at, and listing every name
   * turns a scanning aid into another long list.
   *
   * The currently selected person is kept even at zero, so that choosing
   * someone and then narrowing by category cannot make their own row vanish
   * from under the selection.
   */
  const rows = useMemo(
    () =>
      [...countsByUserId.entries()]
        .filter(([id, count]) => count > 0 || id === value)
        .sort((a, b) => b[1] - a[1]),
    [countsByUserId, value],
  );

  /*
   * The counts arrive keyed by user id, so the names come from the identity
   * lookup the rest of the page already uses. Without it the rows would read
   * as GUIDs, which is the same defect the assignee field had.
   */
  const { userMap } = useUserEnrichment(rows.map(([id]) => id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {/*
        "All assignees" as the first row rather than a separate Clear link: it
        does the same job, but reads as part of the list and shows the
        unfiltered state as a real selection instead of leaving nothing
        highlighted. Same pattern as "All categories" below it.
      */}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        aria-pressed={!value}
        className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
          value
            ? 'text-gray hover:bg-light'
            : 'bg-lighter-blue text-blue font-medium'
        }`}
      >
        All assignees
      </button>

      {rows.map(([userId, count]) => {
        const selected = value === userId;
        return (
          <button
            key={userId}
            type="button"
            onClick={() => onChange(selected ? undefined : userId)}
            aria-pressed={selected}
            title={userMap[userId]?.name ?? 'Unknown user'}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              selected
                ? 'bg-lighter-blue text-blue font-medium'
                : 'text-gray hover:bg-light'
            }`}
          >
            <span className="min-w-0 flex-1 truncate">
              {userMap[userId]?.name ?? 'Unknown user'}
            </span>
            {/*
              Right-aligned and tabular so the numbers form a column the eye can
              compare down, rather than sitting wherever each name ends.
            */}
            <span
              className={`shrink-0 text-xs tabular-nums ${
                selected ? 'text-blue' : 'text-light-gray'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
