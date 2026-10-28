import type { CustomerDeadlineRowDto } from '@/api/local/company-deadlines';
import { PagedTable, usePagedTable } from '@/components/shared';
import type { useListParams } from '@/hooks/useListParams';
import { BaseCheckbox, BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState, PageFilters } from '@brainforgeau/components/page';
import { NavLink } from '@modern-js/runtime/router';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type { FC } from 'react';
import { CUSTOMER_DEADLINES_PATH } from '../paths';

/*
 * The customers a provider supports, a page at a time: name, whether it has
 * deadlines of its own or uses the provider default, open and late tickets.
 * The server searches, filters, sorts and pages.
 */

// biome-ignore lint/suspicious/noExplicitAny: the list params' flag and sort types are the page's
type AnyList = ReturnType<typeof useListParams<any, any>>;

const FLAG_LABELS: Record<string, string> = {
  custom: 'Own deadlines only',
  hasLate: 'Has late tickets',
};

const col = createColumnHelper<CustomerDeadlineRowDto>();

const columns = [
  col.accessor(row => row.name, {
    id: 'name',
    header: 'Customer',
    cell: ({ row }) => (
      <NavLink
        to={`${CUSTOMER_DEADLINES_PATH}/${row.original.tenantId}`}
        state={{ name: row.original.name }}
        className="text-primary text-sm font-medium hover:underline"
      >
        {row.original.name}
      </NavLink>
    ),
    size: 280,
  }),
  col.display({
    id: 'deadlines',
    header: 'Deadlines',
    cell: ({ row }) => (
      <span className="text-default-600 text-sm">
        {row.original.isCustom ? 'Own deadlines' : 'Provider default'}
      </span>
    ),
    size: 200,
  }),
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
      <span
        className={`block text-right text-sm tabular-nums ${
          row.original.late > 0
            ? 'text-red-dark dark:text-red-400 font-semibold'
            : 'text-default-400'
        }`}
      >
        {row.original.late}
      </span>
    ),
    size: 90,
  }),
] as ColumnDef<CustomerDeadlineRowDto, unknown>[];

const rowId = (row: CustomerDeadlineRowDto) => row.tenantId;

interface CustomerDeadlineListProps {
  list: AnyList;
  query: {
    data?: { items: CustomerDeadlineRowDto[]; total: number };
    isLoading: boolean;
    isError: boolean;
  };
}

export const CustomerDeadlineList: FC<CustomerDeadlineListProps> = ({
  list,
  query,
}) => {
  const { params } = list;
  const table = usePagedTable({
    data: query.data?.items ?? [],
    columns,
    total: query.data?.total ?? 0,
    params,
    onChange: list.update,
    getRowId: rowId,
  });
  const total = query.data?.total;

  return (
    <>
      <PageFilters
        onClear={list.hasFilters ? list.clear : undefined}
        hasActiveFilters={list.hasFilters}
        rightSlot={
          total !== undefined && (
            <span className="text-default-500 text-sm" aria-live="polite">
              {total} {total === 1 ? 'customer' : 'customers'}
            </span>
          )
        }
      >
        <BaseInput
          aria-label="Search customers"
          placeholder="Search customers..."
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
        {Object.entries(FLAG_LABELS).map(([flag, label]) => (
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
                ? "Couldn't load the customers"
                : 'No customers match these filters'
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
