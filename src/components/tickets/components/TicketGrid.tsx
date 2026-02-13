import { type FC, useState, useCallback, useMemo } from 'react';
import { BaseTable, BaseButton, Icon, TablePagination } from '@brainforgeau/components';
import { PermissionGuard } from '@brainforgeau/security';
import { NavLink } from '@modern-js/runtime/router';
import { useTicketsData } from '../hooks/useTickets';
import { useTicketsTable } from '../hooks/useTicketsTable';
import { createTicketColumns } from './ticket-grid-columns';
import { TicketFilters } from './TicketFilters';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useBulkUpdateTickets, useUpdateTicket, useBulkDeleteTickets } from '../hooks/useTickets';
import { TicketStatus, TicketPriority } from '@/types/ticket';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { BulkAssignModal } from './BulkAssignModal';
import { BulkStatusModal } from './BulkStatusModal';
import { BulkDeleteModal } from './BulkDeleteModal';
import { addToast } from '@heroui/react';

export const TicketGrid: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { items, totalCount, pagination, setPagination, filters, setFilters, isLoading, refetch } =
    useTicketsData();

  // REVIEW: Real-time updates via SignalR - auto-refreshes grid when tickets change
  useRealtimeTickets();

  const updateTicketMutation = useUpdateTicket();
  const bulkUpdateMutation = useBulkUpdateTickets();
  const bulkDeleteMutation = useBulkDeleteTickets();

  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const handleAssign = useCallback((ticketId: string, assigneeId: string) => {
    updateTicketMutation.mutate({ id: ticketId, updates: { assigneeId } });
  }, [updateTicketMutation]);

  const handleChangeStatus = useCallback((ticketId: string, status: TicketStatus) => {
    updateTicketMutation.mutate({ id: ticketId, updates: { status } });
  }, [updateTicketMutation]);

  const handleChangePriority = useCallback((ticketId: string, priority: TicketPriority) => {
    updateTicketMutation.mutate({ id: ticketId, updates: { priority } });
  }, [updateTicketMutation]);

  const columns = useMemo(
    () => createTicketColumns({ onAssign: handleAssign, onChangeStatus: handleChangeStatus, onChangePriority: handleChangePriority }),
    [handleAssign, handleChangeStatus, handleChangePriority]
  );

  const { table } = useTicketsTable({
    data: items,
    columns,
    totalCount,
    pagination,
    searchTerm,
    onPaginationChange: setPagination,
  });

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

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  const handleBulkAssign = useCallback(() => {
    setIsBulkAssignModalOpen(true);
  }, []);

  const handleBulkChangeStatus = useCallback(() => {
    setIsBulkStatusModalOpen(true);
  }, []);

  const handleBulkDelete = useCallback(() => {
    setIsBulkDeleteModalOpen(true);
  }, []);

  const handleBulkAssignConfirm = useCallback((assigneeId: string | undefined) => {
    const ids = selectedRows.map(row => row.original.id).filter((id): id is string => !!id);
    bulkUpdateMutation.mutate(
      { ids, updates: { assigneeId } },
      {
        onSuccess: () => {
          addToast({
            title: 'Tickets assigned',
            description: `Successfully assigned ${ids.length} ticket${ids.length !== 1 ? 's' : ''}`,
            severity: 'success',
          });
          table.resetRowSelection();
        },
      }
    );
  }, [selectedRows, bulkUpdateMutation, table]);

  const handleBulkStatusConfirm = useCallback((status: TicketStatus) => {
    const ids = selectedRows.map(row => row.original.id).filter((id): id is string => !!id);
    bulkUpdateMutation.mutate(
      { ids, updates: { status } },
      {
        onSuccess: () => {
          addToast({
            title: 'Status updated',
            description: `Successfully updated ${ids.length} ticket${ids.length !== 1 ? 's' : ''}`,
            severity: 'success',
          });
          table.resetRowSelection();
        },
      }
    );
  }, [selectedRows, bulkUpdateMutation, table]);

  const handleBulkDeleteConfirm = useCallback(() => {
    const ids = selectedRows.map(row => row.original.id).filter((id): id is string => !!id);
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        addToast({
          title: 'Tickets deleted',
          description: `Successfully deleted ${ids.length} ticket${ids.length !== 1 ? 's' : ''}`,
          severity: 'success',
        });
        table.resetRowSelection();
      },
    });
  }, [selectedRows, bulkDeleteMutation, table]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setFilters({ ...filters, searchTerm: term });
  }, [filters, setFilters]);

  return (
    <>
      <div className="mb-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
            <BaseButton
              as={NavLink}
              href="/tickets/new"
              color="primary"
              icon={<Icon name="plus" className="h-4 w-4" />}
            >
              New Ticket
            </BaseButton>
          </PermissionGuard>
        </div>

        {/* Filters */}
        <TicketFilters
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
          searchTerm={searchTerm}
        />

        {/* Bulk Actions */}
        {hasSelectedRows && (
          <div className="mt-5 flex items-center gap-4 rounded-lg bg-gray-50 p-4">
            <span className="text-sm font-medium">
              {selectedRows.length} ticket{selectedRows.length !== 1 ? 's' : ''} selected
            </span>
            <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketAssign]} fallback={null}>
              <BaseButton
                variant="bordered"
                size="sm"
                onPress={handleBulkAssign}
                icon={<Icon name="user-plus" className="h-4 w-4" />}
              >
                Assign
              </BaseButton>
            </PermissionGuard>
            <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
              <BaseButton
                variant="bordered"
                size="sm"
                onPress={handleBulkChangeStatus}
                icon={<Icon name="arrow-path" className="h-4 w-4" />}
              >
                Change Status
              </BaseButton>
            </PermissionGuard>
            <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketDelete]} fallback={null}>
              <BaseButton
                variant="bordered"
                size="sm"
                color="danger"
                onPress={handleBulkDelete}
                icon={<Icon name="trash" className="h-4 w-4" />}
              >
                Delete
              </BaseButton>
            </PermissionGuard>
          </div>
        )}
      </div>

      {/* Table */}
      <BaseTable
        table={table}
        fullHeight
        isLoading={isLoading}
        showInfo={false}
        paginationTemplate={paginationTemplate}
      />

      {/* Bulk Action Modals */}
      <BulkAssignModal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setIsBulkAssignModalOpen(false)}
        onConfirm={handleBulkAssignConfirm}
        ticketCount={selectedRows.length}
      />
      <BulkStatusModal
        isOpen={isBulkStatusModalOpen}
        onClose={() => setIsBulkStatusModalOpen(false)}
        onConfirm={handleBulkStatusConfirm}
        ticketCount={selectedRows.length}
      />
      <BulkDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        ticketCount={selectedRows.length}
      />
    </>
  );
};
