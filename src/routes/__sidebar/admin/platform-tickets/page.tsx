import { useState, useCallback, useMemo } from 'react';
import { Checkbox } from '@heroui/react';
import { BaseTable, BaseInput, BaseSelect, BaseSelectItem, Icon, TablePagination } from '@brainforgeau/components';
import {
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { usePlatformTicketsData } from '@/components/admin/hooks/usePlatformTickets';
import { createPlatformTicketColumns, type PlatformTicketRow } from '@/components/admin/platform-tickets/platform-ticket-columns';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import type { PlatformTicketStatus, PlatformTicketPriority } from '@/types/admin';

export default function PlatformTicketsPage() {
  const { items, totalCount, pagination, setPagination, filters, setFilters, isLoading } =
    usePlatformTicketsData();

  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Enrich tickets with user data (submitters + assignees)
  // Phase 2: Platform tickets use requesterId as the submitter (aligned with backend)
  const submitterIds = items.map(t => t.requesterId).filter(Boolean);
  const assigneeIds = items.map(t => t.assigneeId).filter(Boolean);
  const allUserIds = [...submitterIds, ...assigneeIds];
  const { userMap, isLoading: isLoadingUsers } = useUserEnrichment(allUserIds);

  const enrichedItems: PlatformTicketRow[] = useMemo(
    () => items.map(ticket => ({
      ...ticket,
      submitterUserInfo: ticket.requesterId ? userMap[ticket.requesterId] : null,
      assigneeUserInfo: ticket.assigneeId ? userMap[ticket.assigneeId] : null,
    })),
    [items, userMap]
  );

  const columns = useMemo(() => createPlatformTicketColumns(), []);

  const table = useReactTable({
    data: enrichedItems,
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
    pageCount: Math.max(1, Math.ceil(totalCount / pagination.pageSize)),
    rowCount: totalCount,
    enableSorting: true,
    enableGlobalFilter: true,
    enableColumnFilters: false,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === 'function' ? updater(pagination) : updater;
      setPagination(newPagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setFilters({ ...filters, searchTerm: term || undefined });
  }, [filters, setFilters]);

  const handleStatusChange = useCallback((keys: Set<string>) => {
    const value = Array.from(keys)[0] as PlatformTicketStatus | undefined;
    setFilters({ ...filters, status: value || undefined });
  }, [filters, setFilters]);

  const handlePriorityChange = useCallback((keys: Set<string>) => {
    const value = Array.from(keys)[0] as PlatformTicketPriority | undefined;
    setFilters({ ...filters, priority: value || undefined });
  }, [filters, setFilters]);

  const paginationTemplate = useCallback(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    return (
      <TablePagination
        totalPages={totalPages}
        currentPage={pagination.pageIndex + 1}
        onPageChange={(page: number) => setPagination({ ...pagination, pageIndex: page - 1 })}
      />
    );
  }, [totalCount, pagination, setPagination]);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Platform Support Tickets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage platform-wide support tickets across all tenants
            </p>
          </div>
          <Checkbox
            isSelected={filters.mine ?? false}
            onValueChange={(checked: boolean) => setFilters({ ...filters, mine: checked })}
          >
            My Tickets Only
          </Checkbox>
        </div>

        <div className="mb-4 flex w-full flex-wrap items-end gap-2.5">
          <div className="min-w-60 flex-1">
            <BaseInput
              type="text"
              placeholder="Search platform tickets..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              startContent={<Icon name="magnifying-glass" className="h-4 w-4 text-gray-400" />}
            />
          </div>
          <div className="min-w-40">
            <BaseSelect
              label="Status"
              placeholder="Filter by status"
              className="w-full"
              selectedKeys={filters.status ? new Set([filters.status]) : new Set()}
              onSelectionChange={(keys) => handleStatusChange(keys as Set<string>)}
            >
              <BaseSelectItem key="Open">Open</BaseSelectItem>
              <BaseSelectItem key="InProgress">In Progress</BaseSelectItem>
              <BaseSelectItem key="Resolved">Resolved</BaseSelectItem>
              <BaseSelectItem key="Closed">Closed</BaseSelectItem>
            </BaseSelect>
          </div>
          <div className="min-w-40">
            <BaseSelect
              label="Priority"
              placeholder="Filter by priority"
              className="w-full"
              selectedKeys={filters.priority ? new Set([filters.priority]) : new Set()}
              onSelectionChange={(keys) => handlePriorityChange(keys as Set<string>)}
            >
              <BaseSelectItem key="Critical">Critical</BaseSelectItem>
              <BaseSelectItem key="High">High</BaseSelectItem>
              <BaseSelectItem key="Medium">Medium</BaseSelectItem>
              <BaseSelectItem key="Low">Low</BaseSelectItem>
            </BaseSelect>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6">
        <BaseTable
          table={table}
          fullHeight
          isLoading={isLoading || isLoadingUsers}
          showInfo={false}
          paginationTemplate={paginationTemplate}
        />
      </div>
    </div>
  );
}
