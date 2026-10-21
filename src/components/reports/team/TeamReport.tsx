import {
  type TeamReportRowDto,
  getTeamReport,
  getTenantTeamReport,
} from '@/api/local/teamReport';
import { PeriodPicker } from '@/components/reports/kpi/PeriodPicker';
import { defaultMonth } from '@/components/reports/kpi/kpiFormat';
import { UserCell, formatDuration } from '@/components/shared';
import { MultiFilter } from '@/components/tickets/components/TicketFilters';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { useScopeNames } from '@/hooks/useScopeNames';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
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

  const { principalId } = useHelpdeskAccess();
  const { tenantOptions, organisationOptions } = useScopeNames();
  const [tenantIds, setTenantIds] = useState<string[]>(EMPTY);
  const [organisationIds, setOrganisationIds] = useState<string[]>(EMPTY);

  // As on the tickets list: organisations under the chosen tenants, grouped
  // by tenant, and unticking a tenant drops its organisations.
  const scopedOrganisations = useMemo(() => {
    const shown = tenantIds.length
      ? organisationOptions.filter(
          o => o.parentId && tenantIds.includes(o.parentId),
        )
      : organisationOptions;
    return [...shown].sort(
      (a, b) =>
        (a.parentName ?? '').localeCompare(b.parentName ?? '') ||
        a.name.localeCompare(b.name),
    );
  }, [organisationOptions, tenantIds]);
  const handleTenantChange = useCallback(
    (ids: string[]) => {
      const parentOf = new Map(
        organisationOptions.map(o => [o.id, o.parentId]),
      );
      setTenantIds(ids.length ? ids : EMPTY);
      if (ids.length)
        setOrganisationIds(prev =>
          prev.filter(id => {
            const parent = parentOf.get(id);
            return parent !== undefined && ids.includes(parent);
          }),
        );
    },
    [organisationOptions],
  );

  const { from, to } = monthBounds(month);
  const { data, isLoading } = useQuery({
    queryKey: [
      'reports',
      'team',
      principalId ?? 'tenant',
      from,
      to,
      tenantIds,
      organisationIds,
    ],
    queryFn: () => {
      const query = { from, to, tenantIds, organisationIds };
      return principalId
        ? getTeamReport(principalId, query)
        : getTenantTeamReport(query);
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const { userMap } = useUserEnrichment(
    (data?.items ?? []).map(r => r.assigneeId).filter(Boolean) as string[],
  );

  const rows = useMemo(
    () =>
      [...(data?.items ?? [])].sort(
        (a, b) => b.late - a.late || b.open - a.open,
      ),
    [data],
  );

  // The tickets list, overdue, for one person, in the same tenants and
  // organisations as this report (see ticketListUrl for the keys).
  const lateHref = useCallback(
    (row: TeamReportRowDto) => {
      const params = new URLSearchParams({
        tab: 'overdue',
        assignee: row.assigneeId ?? 'unassigned',
      });
      if (tenantIds.length) params.set('tenant', tenantIds.join(','));
      if (organisationIds.length)
        params.set('organisation', organisationIds.join(','));
      return `/tickets?${params.toString()}`;
    },
    [tenantIds, organisationIds],
  );

  const columns: ColumnDef<TeamReportRowDto, any>[] = useMemo(
    () => [
      {
        id: 'person',
        header: 'Technician',
        cell: ({ row }) => {
          const r = row.original;
          if (!r.assigneeId)
            return <span className="text-default-600">Unassigned</span>;
          const user = userMap[r.assigneeId];
          const fallback =
            r.name || r.avatarUrl
              ? {
                  id: r.assigneeId,
                  name: r.name ?? '',
                  avatarUrl: r.avatarUrl ?? undefined,
                }
              : null;
          return <UserCell userInfo={user ?? fallback} fallbackName={r.name} />;
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
    // The Technician cell reads userMap, and Late links carry the filters.
    [userMap, lateHref],
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
        {principalId && (
          <MultiFilter
            label="Tenant"
            plural="tenants"
            options={tenantOptions}
            value={tenantIds}
            onChange={handleTenantChange}
          />
        )}
        <MultiFilter
          label="Organisation"
          plural="organisations"
          options={scopedOrganisations}
          grouped={Boolean(principalId)}
          value={organisationIds}
          onChange={ids => setOrganisationIds(ids.length ? ids : EMPTY)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <BaseTable
          table={table}
          isLoading={isLoading}
          loading={{ title: 'Loading the team...' }}
          fullHeight
        />
      </div>
    </div>
  );
};
