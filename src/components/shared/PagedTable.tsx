import {
  type ListParamsState,
  PAGE_SIZES,
  type SortDir,
} from '@/hooks/useListParams';
import { BaseTable, TablePagination } from '@brainforgeau/components';
import {
  type ColumnDef,
  type Table,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

/*
 * The one server-paged table: the server filters, sorts and pages, the table
 * only draws one page. Its state is useListParams', so the page, the size
 * and the sort live in the address bar. Used by Tenant Deadlines and a
 * tenant's organisations.
 */

type Params = Pick<
  ListParamsState<string, string>,
  'sort' | 'dir' | 'page' | 'pageSize'
>;

export const usePagedTable = <T,>({
  data,
  columns,
  total,
  params,
  onChange,
  getRowId,
}: {
  data: T[];
  // biome-ignore lint/suspicious/noExplicitAny: column value types vary per column
  columns: ColumnDef<T, any>[];
  total: number;
  params: Params;
  onChange: (patch: Partial<Params>) => void;
  getRowId: (row: T) => string;
}): Table<T> => {
  const pagination = { pageIndex: params.page - 1, pageSize: params.pageSize };
  const sorting = [{ id: params.sort, desc: params.dir === 'desc' }];
  return useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
    state: { pagination, sorting },
    onPaginationChange: updater => {
      const next =
        typeof updater === 'function' ? updater(pagination) : updater;
      if (next.pageSize !== params.pageSize)
        onChange({ pageSize: next.pageSize, page: 1 });
      else onChange({ page: next.pageIndex + 1 });
    },
    onSortingChange: updater => {
      const next = (
        typeof updater === 'function' ? updater(sorting) : updater
      )[0];
      if (!next) return;
      onChange({
        sort: next.id,
        dir: (next.desc ? 'desc' : 'asc') as SortDir,
        page: 1,
      });
    },
  });
};

export const PagedTable = <T,>({
  table,
  isLoading,
  empty,
}: {
  table: Table<T>;
  isLoading?: boolean;
  /** Shown instead of the table when the page has no rows. */
  empty: ReactNode;
}) => {
  if (!isLoading && table.getRowModel().rows.length === 0) return <>{empty}</>;
  return (
    <BaseTable
      table={table}
      fullHeight
      isLoading={isLoading}
      showInfo={false}
      paginationTemplate={t =>
        t.getPageCount() > 1 ? (
          <TablePagination
            totalPages={t.getPageCount()}
            currentPage={t.getState().pagination.pageIndex + 1}
            onPageChange={(page: number) => t.setPageIndex(page - 1)}
          />
        ) : (
          // Room for the rows-per-page picker, which sits over this footer.
          <div className="h-10" />
        )
      }
      pageSizeOptions={[...PAGE_SIZES]}
      onPageSizeChange={size => table.setPageSize(size)}
    />
  );
};
