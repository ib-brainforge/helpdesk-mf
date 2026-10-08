import type { TableLayoutController } from '@/components/shared/table-layout';
import {
  type ColumnDef,
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
  /** The user's saved column order, visibility, widths and sort. */
  layout: TableLayoutController;
}

export const useTicketsTable = ({
  data,
  columns,
  totalCount,
  pagination,
  onPaginationChange,
  layout,
}: UseTicketsTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      ...layout.state,
      pagination,
      rowSelection,
    },
    initialState: {
      // The checkbox and Subject stay put while the grid scrolls sideways on a
      // narrow screen, and so does the row menu on the right.
      columnPinning: { left: ['select', 'subject'], right: ['actions'] },
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
    // One write per drag, not one per pixel.
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    onSortingChange: layout.onSortingChange,
    onColumnOrderChange: layout.onColumnOrderChange,
    onColumnVisibilityChange: layout.onColumnVisibilityChange,
    onColumnSizingChange: layout.onColumnSizingChange,
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
