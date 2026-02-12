import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import type { UsersRow } from '../types';

export interface UseUsersTableProps {
  data: UsersRow[];
  columns: ColumnDef<UsersRow, any>[];
  totalCount: number;
  pagination: PaginationState;
  searchTerm: string;
  onPaginationChange: (pagination: PaginationState | ((old: PaginationState) => PaginationState)) => void;
}

export const useUsersTable = ({
  data,
  columns,
  totalCount,
  pagination,
  searchTerm,
  onPaginationChange,
}: UseUsersTableProps) => {
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((user) => {
      const name = user.name?.toLowerCase() ?? '';
      const email = user.email?.toLowerCase() ?? '';
      return name.includes(lowerSearch) || email.includes(lowerSearch);
    });
  }, [data, searchTerm]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
    },
    onPaginationChange,
  });

  return { table };
};
