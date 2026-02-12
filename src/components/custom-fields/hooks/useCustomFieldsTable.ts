import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { CustomFieldsRow } from '../types';

export interface UseCustomFieldsTableProps {
  data: CustomFieldsRow[];
  columns: ColumnDef<CustomFieldsRow, any>[];
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState | ((old: PaginationState) => PaginationState)) => void;
}

export const useCustomFieldsTable = ({
  data,
  columns,
  totalCount,
  pagination,
  onPaginationChange,
}: UseCustomFieldsTableProps) => {
  const table = useReactTable({
    data,
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
