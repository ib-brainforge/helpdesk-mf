import { type TeamReportRowDto, getTeamReport } from '@/api/local/teamReport';
import { PeriodPicker } from '@/components/reports/kpi/PeriodPicker';
import { defaultMonth } from '@/components/reports/kpi/kpiFormat';
import { UserCell, formatDuration } from '@/components/shared';
import { MultiFilter } from '@/components/tickets/components/TicketFilters';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { useScopeNames } from '@/hooks/useScopeNames';
import { type UserInfo, useUserEnrichment } from '@/hooks/useUserEnrichment';
import { BaseTable } from '@brainforgeau/components';
import { Link, useSearchParams } from '@modern-js/runtime/router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { type FC, useCallback, useMemo, useState } from 'react';

/** The first and last day of a YYYY-MM month, as YYYY-MM-DD. */
const monthBounds = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, '0')}`,
  };
};

const EMPTY: string[] = [];

/** A row with its technician resolved: undefined while looking, null if not found. */
type TeamRow = TeamReportRowDto & { user: UserInfo | null | undefined };

/** "1h 42m", or a dash when there is nothing to measure. */
const duration = (minutes: number | null | undefined) =>
  minutes === null || minutes === undefined ? '–' : formatDuration(minutes);

/**
 * Reports > Team: one row per technician (and one for Unassigned tickets),
 * worst first: the most late tickets, then the most open. Late links to the
 * tickets list showing that person's overdue tickets. The Period is the
 * Overview's own picker and month (?month=), so switching tabs keeps it.
 */
export const TeamReport: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? defaultMonth();
  const setMonth = useCallback(
    (next: string) =>
      setSearchParams(
        prev => {
          prev.set('month', next);
          return prev;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const { tenantId: ownTenantId } = useHelpdeskAccess();
  const { organisationOptions } = useScopeNames();
  const [organisationIds, setOrganisationIds] = useState<string[]>(EMPTY);

  // The organisations of the tenant the user is working in.
  const ownOrganisations = useMemo(
    () =>
      [...organisationOptions]
        .filter(o => !ownTenantId || o.parentId === ownTenantId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [organisationOptions, ownTenantId],
  );

  const { from, to } = monthBounds(month);
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'team', from, to, organisationIds],
    queryFn: () => getTeamReport({ from, to, organisationIds }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  /*
   * Names and avatars: helpdesk stores neither, so the report sends ids and
   * they are resolved by useUserEnrichment, the same batched, cached lookup
   * the tickets list and the assignee picker use (no extra request when
   * those already know the person). The person is put on the row itself:
   * BaseTable's body is memoised on its rows, so names carried only by the
   * column definitions never reached cells drawn before they arrived, and
   * every technician stayed "Unknown user".
   */
  const assigneeIds = useMemo(
    () =>
      (data?.items ?? []).flatMap(r => (r.assigneeId ? [r.assigneeId] : [])),
    [data],
  );
  const { userMap, isLoading: loadingNames } = useUserEnrichment(assigneeIds);

  const rows = useMemo(
    (): TeamRow[] =>
      [...(data?.items ?? [])]
        .sort((a, b) => b.late - a.late || b.open - a.open)
        .map(r => ({
          ...r,
          user: r.assigneeId ? userMap[r.assigneeId] : undefined,
        })),
    [data, userMap],
  );

  // The tickets list, overdue, for one person (see ticketListUrl for the keys).
  const lateHref = useCallback((row: TeamReportRowDto) => {
    const params = new URLSearchParams({
      tab: 'overdue',
      assignee: row.assigneeId ?? 'unassigned',
    });
    return `/tickets?${params.toString()}`;
  }, []);

  const columns: ColumnDef<TeamRow, unknown>[] = useMemo(
    () => [
      {
        id: 'person',
        header: 'Technician',
        cell: ({ row }) => {
          const r = row.original;
          if (!r.assigneeId)
            return <span className="text-default-600">Unassigned</span>;
          return (
            <UserCell
              userInfo={
                r.user ??
                (r.avatarUrl && r.name
                  ? { id: r.assigneeId, name: r.name, avatarUrl: r.avatarUrl }
                  : null)
              }
              fallbackName={r.name}
            />
          );
        },
      },
      {
        accessorKey: 'open',
        header: 'Open',
      },
      {
        accessorKey: 'late',
        header: 'Late',
        cell: ({ row }) => {
          const r = row.original;
          if (r.late <= 0) return <span>0</span>;
          return (
            <Link
              to={lateHref(r)}
              className="font-semibold text-danger hover:underline"
              title="Show these overdue tickets"
            >
              {r.late}
            </Link>
          );
        },
      },
      {
        accessorKey: 'closedInPeriod',
        header: 'Closed in period',
      },
      {
        id: 'firstReply',
        header: 'Typical first reply',
        cell: ({ row }) => duration(row.original.medianFirstReplyMinutes),
      },
      {
        id: 'fix',
        header: 'Typical fix',
        cell: ({ row }) => duration(row.original.medianFixMinutes),
      },
    ],
    // Late links carry the filters; names come on the rows.
    [lateHref],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
      <div className="helpdesk-filter-row flex flex-wrap items-end gap-4">
        <PeriodPicker value={month} onChange={setMonth} />
        <MultiFilter
          label="Organisation"
          plural="organisations"
          options={ownOrganisations}
          value={organisationIds}
          onChange={ids => setOrganisationIds(ids.length ? ids : EMPTY)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <BaseTable
          table={table}
          // Waits for the names as the tickets list does, so no row is drawn
          // as "Unknown user" while the lookup is still on its way.
          isLoading={isLoading || loadingNames}
          loading={{ title: 'Loading the team...' }}
          fullHeight
        />
      </div>
    </div>
  );
};
