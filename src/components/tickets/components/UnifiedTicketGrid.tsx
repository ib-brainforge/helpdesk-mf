/**
 * Unified ticket grid for all sources (regular, platform, tenant)
 *
 * Phase 2: Frontend Unification
 * Single grid component that adapts based on ticket source
 */

import { type FC, useState, useCallback, useMemo } from 'react';
import { BaseTable, BaseInput, BaseSelect, BaseSelectItem, Icon, TablePagination } from '@brainforgeau/components';
import { Checkbox } from '@heroui/react';
import {
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useUnifiedTicketsData } from '../hooks/useUnifiedTickets';
import { createUnifiedColumns, type UnifiedTicketRow } from './unified-ticket-columns';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { useTimezone } from '@brainforgeau/security';
import type { TicketSource } from '@/types/unified-ticket';
import { SOURCE_CAPABILITIES } from '@/types/unified-ticket';

export interface UnifiedTicketGridProps {
  source: TicketSource;
  tenantId?: string; // Required for 'tenant' source
}

/**
 * Unified ticket grid component
 *
 * Renders a ticket list with filtering, pagination, and user enrichment.
 * Adapts UI and features based on the ticket source.
 */
export const UnifiedTicketGrid: FC<UnifiedTicketGridProps> = ({ source, tenantId }) => {
  const capabilities = SOURCE_CAPABILITIES[source];
  const timezone = useTimezone();

  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { items, totalCount, pagination, setPagination, filters, setFilters, isLoading } =
    useUnifiedTicketsData({ source, tenantId });

  // Enrich tickets with user data (requesters, assignees, submitters)
  const requesterIds = items.map((t) => t.requesterId).filter(Boolean);
  const assigneeIds = items.map((t) => t.assigneeId).filter(Boolean);
  const submitterIds =
    source === 'platform'
      ? items.map((t) => t.requesterId).filter(Boolean) // Platform uses requesterId for submitter
      : [];
  const allUserIds = [...requesterIds, ...assigneeIds, ...submitterIds];
  const { userMap, isLoading: isLoadingUsers } = useUserEnrichment(allUserIds);

  const enrichedItems: UnifiedTicketRow[] = useMemo(
    () =>
      items.map((ticket) => ({
        ...ticket,
        requesterUserInfo: ticket.requesterId ? userMap[ticket.requesterId] : null,
        assigneeUserInfo: ticket.assigneeId ? userMap[ticket.assigneeId] : null,
        submitterUserInfo:
          source === 'platform' && ticket.requesterId ? userMap[ticket.requesterId] : null,
      })),
    [items, userMap, source]
  );

  const columns = useMemo(() => createUnifiedColumns(source, timezone), [source, timezone]);

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
    enableRowSelection: capabilities.canEdit || capabilities.canAssign,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      setPagination(newPagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setFilters({ ...filters, searchTerm: term || undefined });
    },
    [filters, setFilters]
  );

  const handleStatusChange = useCallback(
    (keys: Set<string>) => {
      const value = Array.from(keys)[0] as string | undefined;
      setFilters({ ...filters, status: value || undefined });
    },
    [filters, setFilters]
  );

  const handlePriorityChange = useCallback(
    (keys: Set<string>) => {
      const value = Array.from(keys)[0] as string | undefined;
      setFilters({ ...filters, priority: value || undefined });
    },
    [filters, setFilters]
  );

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

  const getStatusOptions = () => {
    // Both sources use aligned enum values after Phase 1
    return ['New', 'InProgress', 'Closed'];
  };

  const getPriorityOptions = () => {
    // Both sources use aligned enum values after Phase 1
    return ['Critical', 'High', 'Normal', 'Low', 'None'];
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6">
        <div className="mb-4 flex w-full flex-wrap items-end gap-2.5">
          <div className="min-w-60 flex-1">
            <BaseInput
              type="text"
              placeholder={`Search ${source} tickets...`}
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
              {getStatusOptions().map((status) => (
                <BaseSelectItem key={status}>{status}</BaseSelectItem>
              ))}
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
              {getPriorityOptions().map((priority) => (
                <BaseSelectItem key={priority}>{priority}</BaseSelectItem>
              ))}
            </BaseSelect>
          </div>

          {source === 'platform' && (
            <Checkbox
              isSelected={filters.mine ?? false}
              onValueChange={(checked: boolean) => setFilters({ ...filters, mine: checked })}
            >
              My Tickets Only
            </Checkbox>
          )}

          {source === 'regular' && (
            <Checkbox
              isSelected={filters.unreadOnly ?? false}
              onValueChange={(checked: boolean) =>
                setFilters({ ...filters, unreadOnly: checked })
              }
            >
              Unread Only
            </Checkbox>
          )}
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
};
