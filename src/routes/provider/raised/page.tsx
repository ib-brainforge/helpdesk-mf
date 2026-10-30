/**
 * Raised with our provider: /provider/raised
 *
 * What this tenant has raised with its provider, or had forwarded to it,
 * read only: status and the provider's public replies. Available in every
 * tenant, including a provider's own office for what it raised with the
 * platform owner.
 */

import type { HelpdeskApplicationProviderSupportDTOsRaisedWithProviderTicketDto as RaisedTicket } from '@/api/helpdesk-client';
import { AppAuthSplash } from '@/components/AppSplash';
import { StatusBadge } from '@/components/shared';
import { getPriorityConfig } from '@/components/tickets/ticket-priority-config';
import { getStatusConfig } from '@/components/tickets/ticket-status-config';
import {
  useProviderSupportContext,
  useRaisedWithProvider,
} from '@/hooks/useProviderSupport';
import type { TicketPriority, TicketStatus } from '@/types/ticket';
import { CONTACT_PROVIDER_PATH, RAISED_WITH_PROVIDER_PATH } from '@/views';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState, ListPage } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import {
  useTimezone,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import { NavLink, useNavigate } from '@modern-js/runtime/router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';

const columnHelper = createColumnHelper<RaisedTicket>();

function RaisedWithProviderPage() {
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { data: context } = useProviderSupportContext();
  const { data, isLoading, page, setPage, pageSize } = useRaisedWithProvider();

  const columns = useMemo(
    () => [
      columnHelper.accessor('subject', {
        header: 'Subject',
        cell: ({ getValue, row }) => (
          <NavLink
            to={`${RAISED_WITH_PROVIDER_PATH}/${row.original.id}`}
            className="font-medium text-foreground hover:text-blue hover:underline"
          >
            {getValue() || 'Untitled ticket'}
          </NavLink>
        ),
        size: 360,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getStatusConfig(getValue() as TicketStatus);
          return <StatusBadge color={status.color}>{status.label}</StatusBadge>;
        },
        size: 130,
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: ({ getValue }) => {
          const priority = getPriorityConfig(getValue() as TicketPriority);
          return (
            <StatusBadge color={priority.color}>{priority.label}</StatusBadge>
          );
        },
        size: 130,
      }),
      columnHelper.accessor('createdAt', {
        header: 'Raised',
        cell: ({ getValue }) => (
          <span className="text-sm">
            {formatDateTime(getValue(), { timezone })}
          </span>
        ),
        size: 170,
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Updated',
        cell: ({ getValue }) => (
          <span className="text-sm">
            {formatDateTime(getValue(), { timezone })}
          </span>
        ),
        size: 170,
      }),
    ],
    [timezone],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { pagination: { pageIndex: page - 1, pageSize } },
    onPaginationChange: updater => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil((data?.totalCount ?? 0) / pageSize)),
  });

  const canContact = context?.canContactProvider === true;
  const contact = () => navigate(CONTACT_PROVIDER_PATH);

  return (
    <ListPage
      title="Raised with our provider"
      breadcrumbsKey="provider.raised.list"
      table={table}
      isLoading={isLoading}
      actions={
        canContact && (
          <BaseButton
            color="primary"
            icon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onPress={contact}
          >
            Contact your provider
          </BaseButton>
        )
      }
      empty={
        <EmptyState
          title="Nothing raised with your provider yet"
          description="Requests you send to your provider, and tickets your team forwards to it, appear here with their status and replies."
          action={
            canContact ? (
              <BaseButton color="primary" onPress={contact}>
                Contact your provider
              </BaseButton>
            ) : undefined
          }
        />
      }
    />
  );
}

export default withAuthenticationRequired(RaisedWithProviderPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
