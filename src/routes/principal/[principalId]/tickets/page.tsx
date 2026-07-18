/**
 * Principal ticket list page — /principal/[principalId]/tickets
 *
 * W1-P6: Migrated to <ListPage>.
 * W1-review-fixes: usePrincipal() wired; principalName resolves from identity-management.
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { StatusBadge } from '@/components/shared';
import { usePrincipal } from '@/hooks/usePrincipal';
import {
  useCreatePrincipalTicket,
  usePrincipalTickets,
} from '@/hooks/usePrincipalTickets';
import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseTextarea,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  EmptyState,
  ListPage,
  PendingCrumb,
} from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import type { HelpdeskApplicationTicketsDTOsTicketListDto } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useTimezone } from '@brainforgeau/security';
import { useOverlayState } from '@heroui/react';
import { useParams } from '@modern-js/runtime/router';
import { NavLink } from '@modern-js/runtime/router';
import {
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

const columnHelper =
  createColumnHelper<HelpdeskApplicationTicketsDTOsTicketListDto>();

function PrincipalTicketsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const { data: principal } = usePrincipal(principalId);
  const timezone = useTimezone();
  const disclosureState = useOverlayState();
  const isOpen = disclosureState.isOpen;
  const onOpen = disclosureState.open;
  const onOpenChange = disclosureState.setOpen;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { items, totalCount, pagination, setPagination, isLoading } =
    usePrincipalTickets(principalId ?? '', {
      searchTerm: searchTerm || undefined,
    });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const createMutation = useCreatePrincipalTicket(principalId ?? '');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const pid = principalId ?? '';

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">
            {getValue()?.substring(0, 8) ?? '—'}
          </span>
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
          const colorMap: Record<
            string,
            'primary' | 'warning' | 'success' | 'default'
          > = {
            New: 'primary',
            InProgress: 'warning',
            Closed: 'success',
          };
          return (
            <StatusBadge color={colorMap[s ?? ''] ?? 'default'}>
              {s ?? '—'}
            </StatusBadge>
          );
        },
        size: 120,
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: ({ getValue }) => {
          const p = getValue();
          const colorMap: Record<
            string,
            'danger' | 'warning' | 'primary' | 'default'
          > = {
            Critical: 'danger',
            High: 'warning',
            Normal: 'primary',
            Low: 'default',
            None: 'default',
          };
          return (
            <StatusBadge color={colorMap[p ?? ''] ?? 'default'}>
              {p ?? '—'}
            </StatusBadge>
          );
        },
        size: 120,
      }),
      columnHelper.accessor('categoryId', {
        header: 'Category',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">
            {getValue()?.substring(0, 8) ?? '—'}
          </span>
        ),
        size: 150,
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="text-sm">
            {formatDateTime(getValue(), { timezone })}
          </span>
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
      await createMutation.mutateAsync({
        subject: newSubject,
        description: newDescription,
      });
      setNewSubject('');
      setNewDescription('');
      onClose();
    } catch {
      // Error handled by global axios interceptor
    }
  };

  return (
    <ListPage
      title="Tickets"
      breadcrumbsKey="principal.tickets.list"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
      }}
      table={table}
      isLoading={isLoading}
      actions={
        <BaseButton
          color="primary"
          icon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onPress={onOpen}
        >
          New Ticket
        </BaseButton>
      }
      filters={
        <BaseInput
          placeholder="Search tickets..."
          value={searchTerm}
          onValueChange={handleSearchChange}
          startContent={
            <Icon
              name="magnifying-glass"
              className="h-4 w-4 text-default-400"
            />
          }
          className="max-w-md"
        />
      }
      hasActiveFilters={searchTerm.length > 0}
      onClearFilters={() => {
        setSearchTerm('');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }}
      empty={
        <EmptyState
          title={searchTerm ? 'No tickets match your search' : 'No tickets yet'}
          description={
            searchTerm
              ? 'Try a different search term or clear the filter.'
              : 'Create the first ticket for this principal.'
          }
          action={
            !searchTerm ? (
              <BaseButton color="primary" onPress={onOpen}>
                New Ticket
              </BaseButton>
            ) : undefined
          }
          live
        />
      }
      modals={
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
                    isDisabled={createMutation.isPending || !newSubject.trim()}
                    onPress={() => handleCreate(onClose)}
                  >
                    Create
                  </BaseButton>
                </BaseModalFooter>
              </>
            )}
          </BaseModalContent>
        </BaseModal>
      }
    />
  );
}

export default withAuthenticationRequired(PrincipalTicketsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
