import { useState, useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { BaseTable, BaseInput, BaseSelect, BaseSelectItem, Icon, TablePagination } from '@brainforgeau/components';
import {
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  createColumnHelper,
} from '@tanstack/react-table';
import { NavLink } from '@modern-js/runtime/router';
import { useTenantTicketsData } from '@/components/admin/hooks/useTenantViewer';
import { authStateAtom } from '@/state/auth-atoms';
import { StatusBadge } from '@/components/shared';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { TicketStatus, TicketPriority } from '@/types/ticket';
import type { TicketListDto } from '@/types/ticket';
import type { UserInfo } from '@/hooks/useUserEnrichment';

type TenantTicketRow = TicketListDto & {
  assigneeUserInfo?: UserInfo | null;
  requesterUserInfo?: UserInfo | null;
};

const columnHelper = createColumnHelper<TenantTicketRow>();

const getStatusConfig = (status: string) => {
  switch (status) {
    case TicketStatus.New:
      return { label: 'New', color: 'primary' as const };
    case TicketStatus.InProgress:
      return { label: 'In Progress', color: 'warning' as const };
    case TicketStatus.Closed:
      return { label: 'Closed', color: 'success' as const };
    default:
      return { label: status ?? 'Unknown', color: 'default' as const };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case TicketPriority.Critical:
      return { label: 'Critical', color: 'danger' as const };
    case TicketPriority.High:
      return { label: 'High', color: 'warning' as const };
    case TicketPriority.Normal:
      return { label: 'Normal', color: 'primary' as const };
    case TicketPriority.Low:
      return { label: 'Low', color: 'default' as const };
    default:
      return { label: priority ?? 'Unknown', color: 'default' as const };
  }
};

const tenantViewerColumns: ColumnDef<TenantTicketRow, any>[] = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: ({ getValue }) => {
      const value = getValue();
      return <span className="font-mono text-xs">{value?.substring(0, 8) ?? '—'}</span>;
    },
    size: 100,
  }),
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: ({ getValue, row }) => (
      <NavLink
        to={`/tickets/${row.original.id}`}
        className="font-medium text-foreground hover:text-blue hover:underline"
      >
        {getValue() ?? 'Untitled Ticket'}
      </NavLink>
    ),
    size: 300,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const config = getStatusConfig(getValue() as string);
      return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
    },
    size: 120,
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: ({ getValue }) => {
      const config = getPriorityConfig(getValue() as string);
      return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
    },
    size: 120,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
    cell: ({ getValue }) => <span>{getValue() ?? '—'}</span>,
    size: 150,
  }),
  columnHelper.display({
    id: 'requester',
    header: 'Requester',
    cell: ({ row }) => {
      const name = row.original.requesterUserInfo?.name ?? row.original.requesterName ?? 'Unknown';
      return <span className="text-sm">{name}</span>;
    },
    size: 200,
  }),
  columnHelper.display({
    id: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => {
      if (!row.original.assigneeId) {
        return <span className="text-sm text-muted-foreground">Unassigned</span>;
      }
      const name = row.original.assigneeUserInfo?.name ?? row.original.assigneeName ?? 'Assigned';
      return <span className="text-sm">{name}</span>;
    },
    size: 200,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: ({ getValue }) => {
      const date = getValue();
      return <span className="text-sm">{date ? new Date(date).toLocaleDateString() : '—'}</span>;
    },
    size: 120,
  }),
];

export default function TenantViewerPage() {
  const authState = useAtomValue(authStateAtom);
  const availableContexts = authState.availableContexts;

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const { items, totalCount, pagination, setPagination, filters, setFilters, isLoading } =
    useTenantTicketsData(selectedTenantId);

  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Enrich tickets with user data
  const assigneeIds = items.map(t => t.assigneeId).filter(Boolean);
  const requesterIds = items.map(t => t.requesterId).filter(Boolean);
  const allUserIds = [...assigneeIds, ...requesterIds];
  const { userMap, isLoading: isLoadingUsers } = useUserEnrichment(allUserIds);

  const enrichedItems: TenantTicketRow[] = useMemo(
    () => items.map(ticket => ({
      ...ticket,
      assigneeUserInfo: ticket.assigneeId ? userMap[ticket.assigneeId] : null,
      requesterUserInfo: ticket.requesterId ? userMap[ticket.requesterId] : null,
    })),
    [items, userMap]
  );

  const table = useReactTable({
    data: enrichedItems,
    columns: tenantViewerColumns,
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
    enableRowSelection: false,
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

  const handleTenantChange = useCallback((keys: Set<string>) => {
    const tenantId = Array.from(keys)[0] ?? null;
    setSelectedTenantId(tenantId);
    setPagination({ ...pagination, pageIndex: 0 });
  }, [pagination, setPagination]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setFilters({ ...filters, searchTerm: term || undefined });
  }, [filters, setFilters]);

  const handleStatusChange = useCallback((keys: Set<string>) => {
    const value = Array.from(keys)[0] ?? undefined;
    setFilters({ ...filters, status: value });
  }, [filters, setFilters]);

  const handlePriorityChange = useCallback((keys: Set<string>) => {
    const value = Array.from(keys)[0] ?? undefined;
    setFilters({ ...filters, priority: value });
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

  // Deduplicate tenants (availableContexts may have multiple entries per tenant for different orgs/divisions)
  const tenantOptions = useMemo(() => {
    const seen = new Set<string>();
    return availableContexts.filter(ctx => {
      if (!ctx.tenantId || seen.has(ctx.tenantId)) return false;
      seen.add(ctx.tenantId);
      return true;
    });
  }, [availableContexts]);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold">Tenant Ticket Viewer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View tickets from any tenant for debugging and support purposes
          </p>
        </div>

        <div className="mb-4 flex w-full flex-wrap items-end gap-2.5">
          <div className="min-w-60">
            <BaseSelect
              label="Tenant"
              placeholder="Select a tenant"
              className="w-full"
              selectedKeys={selectedTenantId ? new Set([selectedTenantId]) : new Set()}
              onSelectionChange={(keys) => handleTenantChange(keys as Set<string>)}
            >
              {tenantOptions.map(ctx => (
                <BaseSelectItem key={ctx.tenantId!}>
                  {ctx.tenantName ?? ctx.tenantId}
                </BaseSelectItem>
              ))}
            </BaseSelect>
          </div>
          {selectedTenantId && (
            <>
              <div className="min-w-60 flex-1">
                <BaseInput
                  type="text"
                  placeholder="Search tickets..."
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
                  <BaseSelectItem key="New">New</BaseSelectItem>
                  <BaseSelectItem key="InProgress">In Progress</BaseSelectItem>
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
                  <BaseSelectItem key="Normal">Normal</BaseSelectItem>
                  <BaseSelectItem key="Low">Low</BaseSelectItem>
                </BaseSelect>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6">
        {!selectedTenantId ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Select a tenant above to view their tickets
          </div>
        ) : (
          <BaseTable
            table={table}
            fullHeight
            isLoading={isLoading || isLoadingUsers}
            showInfo={false}
            paginationTemplate={paginationTemplate}
          />
        )}
      </div>
    </div>
  );
}
