import type {
  DeadlineDifferenceDto,
  PagedDto,
} from '@/api/local/company-deadlines';
import { IconTip, PagedTable, usePagedTable } from '@/components/shared';
import type { useListParams } from '@/hooks/useListParams';
import { BaseCheckbox, BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState, PageFilters } from '@brainforgeau/components/page';
import { NavLink } from '@modern-js/runtime/router';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { DeadlineDifferences, LateCount } from './DeadlineCells';

/*
 * The one deadlines list: the tenants on Tenant Deadlines and a tenant's
 * organisations on its page. Search, filter boxes, the count, then a
 * server-paged table of name, what differs, open and late, so both lists
 * look and behave the same.
 */

interface DeadlineListRow {
  name: string;
  isCustom: boolean;
  differences: DeadlineDifferenceDto[];
  open: number;
  late: number;
}

// biome-ignore lint/suspicious/noExplicitAny: the list params' flag and sort types vary per list
type AnyList = ReturnType<typeof useListParams<any, any>>;

interface DeadlineListProps<T extends DeadlineListRow> {
  list: AnyList;
  flagLabels: Record<string, string>;
  query: {
    data?: PagedDto<T>;
    isLoading: boolean;
    isError: boolean;
  };
  /** "tenant", "organisation". */
  noun: string;
  /** Where differences are measured from: "default", "Remondis". */
  fromName: string;
  getRowId: (row: T) => string;
  pathOf: (row: T) => string;
  lateOf: (row: T) => { tenantId: string; organisationId?: string };
  /**
   * Columns after Deadlines (the tenants list counts organisations). This,
   * pathOf and lateOf should be stable (module level or memoised).
   */
  extraColumns?: ColumnDef<T, unknown>[];
}

export const DeadlineList = <T extends DeadlineListRow>({
  list,
  flagLabels,
  query,
  noun,
  fromName,
  getRowId,
  pathOf,
  lateOf,
  extraColumns,
}: DeadlineListProps<T>) => {
  const { params } = list;
  const columns = useMemo(() => {
    const col = createColumnHelper<T>();
    const name = noun.charAt(0).toUpperCase() + noun.slice(1);
    return [
      // Accessor columns, since only those sort; the server does the sorting.
      col.accessor(row => row.name, {
        id: 'name',
        header: name,
        cell: ({ row }) => (
          <NavLink
            to={pathOf(row.original)}
            className="text-primary text-sm font-medium hover:underline"
          >
            {row.original.name}
          </NavLink>
        ),
        size: 240,
      }),
      col.display({
        id: 'deadlines',
        header: 'Deadlines',
        cell: ({ row }) => {
          const { differences, isCustom } = row.original;
          return (
            <div className="whitespace-normal py-1">
              <DeadlineDifferences
                differences={differences}
                fromName={fromName}
              />
              {isCustom && differences.length === 0 && (
                <span className="text-default-500 text-xs"> (own copy)</span>
              )}
            </div>
          );
        },
        size: 380,
      }),
      ...(extraColumns ?? []),
      col.accessor(row => row.open, {
        id: 'open',
        header: () => <span className="block text-right">Open</span>,
        sortDescFirst: true,
        cell: ({ row }) => (
          <span className="block text-right text-sm tabular-nums">
            {row.original.open}
          </span>
        ),
        size: 90,
      }),
      col.accessor(row => row.late, {
        id: 'late',
        header: () => <span className="block text-right">Late</span>,
        sortDescFirst: true,
        cell: ({ row }) => (
          <LateCount
            late={row.original.late}
            {...lateOf(row.original)}
            name={row.original.name}
          />
        ),
        size: 90,
      }),
      col.display({
        id: 'go',
        header: () => <span className="sr-only">Open</span>,
        cell: ({ row }) => (
          <IconTip label={`Open ${row.original.name}'s deadlines`}>
            <NavLink
              to={pathOf(row.original)}
              aria-label={`Open ${row.original.name}'s deadlines`}
              className="text-default-400 hover:text-primary flex h-6 w-6 items-center justify-center rounded"
            >
              <Icon name="ChevronRightIcon" className="h-4 w-4" />
            </NavLink>
          </IconTip>
        ),
        size: 48,
      }),
    ] as ColumnDef<T, unknown>[];
  }, [noun, fromName, pathOf, lateOf, extraColumns]);

  const table = usePagedTable({
    data: query.data?.items ?? [],
    columns,
    total: query.data?.total ?? 0,
    params,
    onChange: list.update,
    getRowId,
  });
  const total = query.data?.total;
  const plural = `${noun}s`;

  return (
    <>
      <PageFilters
        onClear={list.hasFilters ? list.clear : undefined}
        hasActiveFilters={list.hasFilters}
        rightSlot={
          total !== undefined && (
            <span className="text-default-500 text-sm" aria-live="polite">
              {total} {total === 1 ? noun : plural}
            </span>
          )
        }
      >
        <BaseInput
          aria-label={`Search ${plural}`}
          placeholder={`Search ${plural}...`}
          value={list.searchText}
          onChange={e => list.setSearchText(e.target.value)}
          startContent={
            <Icon
              name="magnifying-glass"
              className="h-4 w-4 text-default-400"
            />
          }
          className="helpdesk-filter-row max-w-xs"
        />
        {Object.entries(flagLabels).map(([flag, label]) => (
          <BaseCheckbox
            key={flag}
            isSelected={Boolean(params.flags[flag])}
            onValueChange={checked =>
              list.update({ flags: { ...params.flags, [flag]: checked } })
            }
          >
            {label}
          </BaseCheckbox>
        ))}
      </PageFilters>
      <PagedTable
        table={table}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title={
              query.isError
                ? `Couldn't load the ${plural}`
                : `No ${plural} match these filters`
            }
            description={
              query.isError
                ? 'Reload the page to try again.'
                : 'Try a different name, or clear the filters.'
            }
            live
          />
        }
      />
    </>
  );
};
