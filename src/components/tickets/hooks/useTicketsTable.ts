import type { TableLayoutController } from '@/components/shared/table-layout';
import {
  type ColumnDef,
  type ColumnSizingState,
  type PaginationState,
  type RowSelectionState,
  getCoreRowModel,
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
  /** The user's saved column order, visibility and sort. */
  layout: TableLayoutController;
  /** Widths that follow the content (useFitColumns). */
  columnSizing: ColumnSizingState;
}

export const useTicketsTable = ({
  data,
  columns,
  totalCount,
  pagination,
  onPaginationChange,
  layout,
  columnSizing,
}: UseTicketsTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      ...layout.state,
      columnSizing,
      pagination,
      rowSelection,
    },
    initialState: {
      // The checkbox and the row menu stay put while the grid scrolls
      // sideways. Subject is not pinned: it can sit anywhere in the order.
      columnPinning: { left: ['select'], right: ['actions'] },
    },
    getRowId: row => row.id ?? '',
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalCount / pagination.pageSize)),
    rowCount: totalCount,
    /*
     * Sorted on the server, across every page. It used to sort only the page
     * in hand, so "oldest first" meant oldest of these 25.
     */
    manualSorting: true,
    enableSorting: true,
    enableSortingRemoval: true,
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
    // Widths follow the content, so there is nothing to resize. Columns are
    // reordered in the Columns chooser.
    enableColumnResizing: false,
    onSortingChange: layout.onSortingChange,
    onColumnVisibilityChange: layout.onColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: updater => {
      if (onPaginationChange) {
        const newPagination =
          typeof updater === 'function' ? updater(pagination) : updater;
        onPaginationChange(newPagination);
      }
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return { table };
};
