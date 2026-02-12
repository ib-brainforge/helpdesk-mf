import { useState } from 'react';
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { TicketRow } from '../types';

interface UseTicketsTableProps {
  data: TicketRow[];
  columns: ColumnDef<TicketRow>[];
  totalCount: number;
  pagination: PaginationState;
  searchTerm: string;
  onPaginationChange?: (pagination: PaginationState) => void;
}

export const useTicketsTable = ({
  data,
  columns,
  totalCount,
  pagination,
  searchTerm,
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
      globalFilter: searchTerm,
      rowSelection,
    },
    getRowId: (row) => row.id ?? '',
    manualPagination: true,
    rowCount: totalCount,
    enableSorting: true,
    enableGlobalFilter: true,
    enableColumnFilters: false,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      if (onPaginationChange) {
        const newPagination =
          typeof updater === 'function' ? updater(pagination) : updater;
        onPaginationChange(newPagination);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return { table };
};
