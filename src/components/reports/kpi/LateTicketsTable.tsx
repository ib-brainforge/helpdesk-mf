import type { KpiLateItemDto, KpiReportDto } from '@/api/local/kpi';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { StatusBadge } from '@/components/shared';
import { formatDuration } from '@/components/shared/deadline';
import { getPriorityConfig } from '@/components/tickets/ticket-priority-config';
import { useScopeNames } from '@/hooks/useScopeNames';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { TicketPriority } from '@/types/ticket';
import { BaseTable } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { NavLink } from '@modern-js/runtime/router';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { type FC, useCallback, useMemo, useState } from 'react';
import { KpiPanel } from './KpiPanel';

const FIRST = 4;

const columnHelper = createColumnHelper<KpiLateItemDto>();

interface LateTicketsTableProps {
  late: NonNullable<KpiReportDto['late']>;
  monthName: string;
}

/**
 * One company's tickets that missed a deadline in the month, most late
 * first. Four at first, then all the backend sent (at most 50).
 */
export const LateTicketsTable: FC<LateTicketsTableProps> = ({
  late,
  monthName,
}) => {
  // Names for the ids the report sends, from lists other screens already
  // cache (same query keys), and only while a late list is on screen.
  const { categories } = useCategoriesData();
  const { byOrganisationId } = useScopeNames();
  const { userMap: users } = useUserEnrichment(
    useMemo(() => late.items.map(i => i.assigneeId), [late.items]),
  );
  const categoryName = useMemo(() => {
    const names = new Map<string, string>();
    for (const c of categories) names.set(c.id, c.name);
    return (id: string | null) => (id ? names.get(id) : undefined);
  }, [categories]);
  const organisationName = useCallback(
    (id: string | null) => (id ? byOrganisationId.get(id) : undefined),
    [byOrganisationId],
  );

  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(
    () => (showAll ? late.items : late.items.slice(0, FIRST)),
    [late.items, showAll],
  );

  const columns = useMemo(
    (): ColumnDef<KpiLateItemDto, unknown>[] => [
      columnHelper.display({
        id: 'ticket',
        header: 'Ticket',
        // Tickets have no display number; the short id, as the Tickets list shows it.
        cell: ({ row }) => (
          <NavLink
            to={`/tickets/${row.original.ticketId}`}
            className="text-primary font-mono text-xs hover:underline"
          >
            {row.original.ticketId.slice(0, 8)}
          </NavLink>
        ),
        size: 90,
      }),
      columnHelper.display({
        id: 'subject',
        header: 'Subject',
        cell: ({ row }) => (
          <NavLink
            to={`/tickets/${row.original.ticketId}`}
            className="text-dark block truncate hover:underline dark:text-white"
            title={row.original.subject}
          >
            {row.original.subject}
          </NavLink>
        ),
        size: 320,
      }),
      columnHelper.display({
        id: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const name = categoryName(row.original.categoryId) ?? '–';
          return (
            <span className="block truncate" title={name}>
              {name}
            </span>
          );
        },
        size: 220,
      }),
      columnHelper.display({
        id: 'organisation',
        header: 'Organisation',
        cell: ({ row }) => {
          const name = organisationName(row.original.organisationId);
          return name ? (
            <span className="rounded-[2px] bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
              {name}
            </span>
          ) : null;
        },
        size: 150,
      }),
      columnHelper.display({
        id: 'priority',
        header: 'Priority',
        cell: ({ row }) => {
          const c = getPriorityConfig(row.original.priority as TicketPriority);
          return <StatusBadge color={c.color}>{c.label}</StatusBadge>;
        },
        size: 90,
      }),
      columnHelper.display({
        id: 'missed',
        header: 'Missed',
        cell: ({ row }) => (
          <span className="bg-default-100 text-default-700 rounded-[2px] px-1.5 py-0.5 text-xs">
            {row.original.missed}
          </span>
        ),
        size: 80,
      }),
      columnHelper.display({
        id: 'lateBy',
        header: () => <span className="block text-right">Late by</span>,
        cell: ({ row }) => (
          <span className="block text-right font-semibold text-[#ae2e24] tabular-nums">
            {formatDuration(row.original.lateByMinutes)}
          </span>
        ),
        size: 90,
      }),
      columnHelper.display({
        id: 'assignee',
        header: 'Assignee',
        cell: ({ row }) => {
          const id = row.original.assigneeId;
          if (!id) return <span className="text-default-400">Unassigned</span>;
          return <span>{users[id]?.name ?? '…'}</span>;
        },
        size: 140,
      }),
    ],
    [categoryName, organisationName, users],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: r => r.ticketId,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <KpiPanel
      title={`Late in ${monthName}: ${late.missedCount} of ${late.totalCount} tickets missed a deadline`}
      aside={
        late.items.length > FIRST && (
          <BaseButton
            variant="link"
            size="none"
            className="text-primary text-sm print:hidden"
            onPress={() => setShowAll(v => !v)}
          >
            {showAll
              ? `Show the first ${FIRST}`
              : `See all ${late.items.length}`}
          </BaseButton>
        )
      }
    >
      {late.items.length === 0 ? (
        <p className="text-default-500 px-5 py-6 text-sm">
          No ticket missed a deadline in {monthName}.
        </p>
      ) : (
        <BaseTable table={table} embedded />
      )}
    </KpiPanel>
  );
};
