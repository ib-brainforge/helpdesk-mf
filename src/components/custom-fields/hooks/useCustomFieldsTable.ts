import type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
} from '@tanstack/react-table';
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
  onPaginationChange: (
    pagination: PaginationState | ((old: PaginationState) => PaginationState),
  ) => void;
  /**
   * DTO tenancy/scope metadata initiative -- `useScopeList`'s `rowSelection`/
   * `onRowSelectionChange`, wired straight through so this table's own
   * `selectionColumn` checkboxes (via `scope.tableProps`) drive the same
   * selection the bulk scope editor reads. Both optional so this hook stays
   * usable without scope wiring.
   */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}

export const useCustomFieldsTable = ({
  data,
  columns,
  totalCount,
  pagination,
  onPaginationChange,
  rowSelection,
  onRowSelectionChange,
}: UseCustomFieldsTableProps) => {
  const table = useReactTable({
    data,
    columns,
    // Keys row selection by the record's own id, matching `useScopeList`'s
    // `getRecordId` on the custom-fields list page -- required so
    // `scope.rowSelection` (keyed by id) and the table's own selection
    // checkboxes agree on the same keys.
    getRowId: row => row.id ?? '',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    enableRowSelection: rowSelection != null,
    state: {
      pagination,
      ...(rowSelection != null ? { rowSelection } : {}),
    },
    onPaginationChange,
    onRowSelectionChange,
  });

  return { table };
};
