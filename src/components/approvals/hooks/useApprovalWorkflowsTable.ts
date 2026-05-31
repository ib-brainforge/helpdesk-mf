import type { ApprovalWorkflowListDto } from '@/types/approval';
import {
  type PaginationState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';

interface UseApprovalWorkflowsTableProps {
  data: ApprovalWorkflowListDto[];
  columns: any[];
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (updater: any) => void;
}

export const useApprovalWorkflowsTable = ({
  data,
  columns,
  totalCount,
  pagination,
  onPaginationChange,
}: UseApprovalWorkflowsTableProps) => {
  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
    },
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  return {
    table,
  };
};
