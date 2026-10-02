import {
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { TicketRow } from '../types';

interface UseTicketsTableProps {
  data: TicketRow[];
  columns: ColumnDef<TicketRow>[];
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
}

export const useTicketsTable = ({
  data,
  columns,
  totalCount,
  pagination,
  onPaginationChange,
}: UseTicketsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
      rowSelection,
    },
    getRowId: row => row.id ?? '',
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalCount / pagination.pageSize)),
    rowCount: totalCount,
    enableSorting: true,
    /*
     * No client-side search. The rows are the server's search results already:
     * it matches assignee and requester names, category, scope, status and the
     * id. Filtering them again here by the visible text dropped every row
     * matched through something the table does not show as plain text (a
     * search for an assignee's name listed nothing under a badge of 414).
     */
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: updater => {
      if (onPaginationChange) {
        const newPagination =
          typeof updater === 'function' ? updater(pagination) : updater;
        onPaginationChange(newPagination);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return { table };
};
