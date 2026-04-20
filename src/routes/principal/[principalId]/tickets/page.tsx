/**
 * Principal ticket list page — /principal/[principalId]/tickets
 *
 * Lists all tickets scoped to this principal.
 * Available to both admin and agent roles.
 */

import { useState, useMemo } from 'react';
import { withAuthenticationRequired } from '@brainforgeau/security';
import {
  PageSpinner,
  BaseTable,
  TablePagination,
  BaseButton,
  BaseInput,
  BaseTextarea,
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
} from '@brainforgeau/components';
import { useOutletContext, useParams } from '@modern-js/runtime/router';
import { useTimezone } from '@brainforgeau/security';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { NavLink } from '@modern-js/runtime/router';
import { formatDateTime } from '@brainforgeau/components/utils';
import { StatusBadge } from '@/components/shared';
import { usePrincipalTickets, useCreatePrincipalTicket } from '@/hooks/usePrincipalTickets';
import type { PrincipalOutletContext } from '../layout';
import type { HelpdeskApplicationTicketsDTOsTicketListDto } from '@brainforgeau/helpdesk-client';
import { useDisclosure, addToast } from '@heroui/react';

const columnHelper = createColumnHelper<HelpdeskApplicationTicketsDTOsTicketListDto>();

function PrincipalTicketsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const timezone = useTimezone();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { items, totalCount, pagination, setPagination, isLoading } = usePrincipalTickets(
    principalId ?? context?.principalId ?? '',
    { searchTerm: searchTerm || undefined },
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Reset to first page when search changes
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const createMutation = useCreatePrincipalTicket(principalId ?? context?.principalId ?? '');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const pid = principalId ?? context?.principalId ?? '';

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue()?.substring(0, 8) ?? '—'}</span>
        ),
        size: 100,
      }),
      columnHelper.accessor('subject', {
        header: 'Subject',
        cell: ({ getValue, row }) => (
          <NavLink
            to={`/principal/${pid}/tickets/${row.original.id}`}
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
          const s = getValue();
          const colorMap: Record<string, 'primary' | 'warning' | 'success' | 'default'> = {
            New: 'primary',
            InProgress: 'warning',
            Closed: 'success',
          };
          return <StatusBadge color={colorMap[s ?? ''] ?? 'default'}>{s ?? '—'}</StatusBadge>;
        },
        size: 120,
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: ({ getValue }) => {
          const p = getValue();
          const colorMap: Record<string, 'danger' | 'warning' | 'primary' | 'default'> = {
            Critical: 'danger',
            High: 'warning',
            Normal: 'primary',
            Low: 'default',
            None: 'default',
          };
          return <StatusBadge color={colorMap[p ?? ''] ?? 'default'}>{p ?? '—'}</StatusBadge>;
        },
        size: 120,
      }),
      columnHelper.accessor('categoryId', {
        header: 'Category',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue()?.substring(0, 8) ?? '—'}</span>
        ),
        size: 150,
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatDateTime(getValue(), { timezone })}</span>
        ),
        size: 150,
      }),
    ],
    [pid, timezone],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
  });

  const handleCreate = async (onClose: () => void) => {
    if (!newSubject.trim()) return;
    try {
      await createMutation.mutateAsync({ subject: newSubject, description: newDescription });
      addToast({ title: 'Ticket created', color: 'success' });
      setNewSubject('');
      setNewDescription('');
      onClose();
    } catch {
      addToast({ title: 'Failed to create ticket', color: 'danger' });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <BaseButton
          color="primary"
          onPress={onOpen}
        >
          New Ticket
        </BaseButton>
      </div>

      <div className="flex items-center gap-2">
        <BaseInput
          placeholder="Search tickets..."
          value={searchTerm}
          onValueChange={handleSearchChange}
          className="w-64"
        />
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <PageSpinner title="Loading tickets..." />
        </div>
      ) : (
        <>
          <BaseTable table={table} />
          <TablePagination
            totalPages={Math.max(1, Math.ceil(totalCount / pagination.pageSize))}
            currentPage={pagination.pageIndex + 1}
            onPageChange={(page: number) => setPagination({ ...pagination, pageIndex: page - 1 })}
          />
        </>
      )}

      <BaseModal isOpen={isOpen} onOpenChange={onOpenChange}>
        <BaseModalContent>
          {onClose => (
            <>
              <BaseModalHeader>New Ticket</BaseModalHeader>
              <BaseModalBody>
                <BaseInput
                  label="Subject"
                  value={newSubject}
                  onValueChange={setNewSubject}
                  isRequired
                />
                <BaseTextarea
                  label="Description"
                  value={newDescription}
                  onValueChange={setNewDescription}
                  minRows={3}
                />
              </BaseModalBody>
              <BaseModalFooter>
                <BaseButton variant="light" onPress={onClose}>
                  Cancel
                </BaseButton>
                <BaseButton
                  color="primary"
                  isDisabled={!newSubject.trim()}
                  isLoading={createMutation.isPending}
                  onPress={() => handleCreate(onClose)}
                >
                  Create
                </BaseButton>
              </BaseModalFooter>
            </>
          )}
        </BaseModalContent>
      </BaseModal>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalTicketsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
