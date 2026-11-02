import type { TenantDeadlineRowDto } from '@/api/local/tenant-deadlines';
import { getTenantDeadlines } from '@/api/local/tenant-deadlines';
import { toSortParam, withSortKeys } from '@/utils/listSort';
import { BaseCheckbox } from '@brainforgeau/components';
import {
  ListPage,
  SearchFilter,
  boolParam,
  useListPage,
} from '@brainforgeau/components/page';
import { NavLink } from '@modern-js/runtime/router';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type { FC } from 'react';
import { deadlineKeys } from '../hooks/useTenantDeadlines';
import { TENANT_DEADLINES_PATH } from '../paths';

/*
 * The tenants a provider supports, a page at a time: name, whether it has
 * deadlines of its own or uses the provider default, open and late tickets.
 * The server searches, filters, sorts and pages.
 */

const FILTER_CODECS = { custom: boolParam(), hasLate: boolParam() };

const FLAG_LABELS = {
  custom: 'Own deadlines only',
  hasLate: 'Has late tickets',
} as const;

/** Sortable columns by column id, with the key of the tenant deadlines `sort` each one sorts on. */
const SORT_KEYS = {
  name: 'name',
  deadlines: 'deadlines',
  open: 'open',
  late: 'late',
} as const;

const col = createColumnHelper<TenantDeadlineRowDto>();

const columns = [
  col.accessor(row => row.name, {
    id: 'name',
    header: 'Tenant',
    meta: { label: 'Tenant' },
    enableHiding: false,
    cell: ({ row }) => (
      <NavLink
        to={`${TENANT_DEADLINES_PATH}/${row.original.tenantId}`}
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
    meta: { label: 'Deadlines' },
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
    meta: { label: 'Open' },
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
    meta: { label: 'Late' },
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
] as ColumnDef<TenantDeadlineRowDto, unknown>[];

const sortableColumns = withSortKeys(columns, SORT_KEYS);

export const TenantDeadlineList: FC = () => {
  const list = useListPage<TenantDeadlineRowDto, typeof FILTER_CODECS>({
    listId: 'helpdesk.provider-deadlines',
    // Under the key a saved policy invalidates (see deadlineKeys).
    queryKey: deadlineKeys.tenants(),
    columns: sortableColumns,
    search: {},
    filters: FILTER_CODECS,
    getRowId: row => row.tenantId,
    queryFn: async ({ pageIndex, pageSize, sorting, search, listFilters }) => {
      const page = await getTenantDeadlines({
        search,
        custom: listFilters.custom,
        hasLate: listFilters.hasLate,
        sort: toSortParam(sorting, SORT_KEYS),
        page: pageIndex + 1,
        pageSize,
      });
      return { rows: page.items, totalCount: page.total };
    },
  });
  const { filters, setFilter } = list;

  return (
    <ListPage
      title="Tenant Deadlines"
      breadcrumbsKey="provider.deadlines.list"
      helpKey="helpdesk.provider.deadlines"
      list={list}
      personalise
      countNoun={{ one: 'tenant', other: 'tenants' }}
      loadError={list.isError ? list.error : undefined}
      onRetry={() => void list.refetch()}
      filters={
        <>
          <SearchFilter
            value={list.search}
            onValueChange={list.setSearch}
            placeholder="Search tenants..."
            ariaLabel="Search tenants"
          />
          {(Object.keys(FLAG_LABELS) as Array<keyof typeof FLAG_LABELS>).map(
            flag => (
              <BaseCheckbox
                key={flag}
                isSelected={filters[flag]}
                onValueChange={checked => setFilter(flag, checked)}
              >
                {FLAG_LABELS[flag]}
              </BaseCheckbox>
            ),
          )}
        </>
      }
    />
  );
};
