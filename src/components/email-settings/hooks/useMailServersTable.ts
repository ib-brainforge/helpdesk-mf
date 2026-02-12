import { useState } from 'react';
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { MailServerRow } from '../types';

interface UseMailServersTableProps {
  data: MailServerRow[];
  columns: ColumnDef<MailServerRow>[];
  totalCount: number;
  pagination: PaginationState;
  searchTerm?: string;
  onPaginationChange?: (pagination: PaginationState) => void;
}

export const useMailServersTable = ({
  data,
  columns,
  totalCount,
  pagination,
  searchTerm = '',
  onPaginationChange,
}: UseMailServersTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
      globalFilter: searchTerm,
    },
    getRowId: (row) => row.id ?? '',
    manualPagination: true,
    rowCount: totalCount,
    enableSorting: true,
    enableGlobalFilter: true,
    enableColumnFilters: false,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
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
