import { BaseButton, Icon } from '@brainforgeau/components';
import { PermissionGuard } from '@brainforgeau/security';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { NavLink } from '@modern-js/runtime/router';
import type { TicketRow } from '../types';
import { TicketStatus, TicketPriority } from '@/types/ticket';
import { Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { HelpdeskPermissions } from '@/constants/permissions';

const columnHelper = createColumnHelper<TicketRow>();

// Helper functions for status and priority display
const getStatusConfig = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.New:
      return { label: 'New', color: 'primary' as const };
    case TicketStatus.InProgress:
      return { label: 'In Progress', color: 'warning' as const };
    case TicketStatus.Closed:
      return { label: 'Closed', color: 'success' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const getPriorityConfig = (priority: TicketPriority) => {
  switch (priority) {
    case TicketPriority.Critical:
      return { label: 'Critical', color: 'danger' as const };
    case TicketPriority.High:
      return { label: 'High', color: 'warning' as const };
    case TicketPriority.Normal:
      return { label: 'Normal', color: 'primary' as const };
    case TicketPriority.Low:
      return { label: 'Low', color: 'default' as const };
    case TicketPriority.None:
      return { label: 'None', color: 'default' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

interface CreateColumnsOptions {
  onAssign?: (ticketId: string, assigneeId: string) => void;
  onChangeStatus?: (ticketId: string, status: TicketStatus) => void;
  onChangePriority?: (ticketId: string, priority: TicketPriority) => void;
}

export const createTicketColumns = (
  options: CreateColumnsOptions,
): ColumnDef<TicketRow, any>[] => [
  // Checkbox column for bulk actions
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
  }),
  columnHelper.accessor('id', {
    header: 'ID',
    cell: ({ getValue }) => {
      const value = getValue();
      // Display short ID (first 8 characters)
      const shortId = value?.substring(0, 8) ?? '—';
      return <span className="font-mono text-xs">{shortId}</span>;
    },
    size: 100,
  }),
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: ({ getValue, row }) => {
      const value = getValue();
      const unread = row.original.unreadForAgent;
      return (
        <div className="flex items-center gap-2">
          {unread && (
            <span className="flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          <NavLink
            to={`/tickets/${row.original.id}`}
            className="font-medium text-foreground hover:text-blue hover:underline"
          >
            {value ?? 'Untitled Ticket'}
          </NavLink>
        </div>
      );
    },
    size: 300,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue();
      const config = getStatusConfig(status);
      return (
        <Chip color={config.color} variant="flat" size="sm">
          {config.label}
        </Chip>
      );
    },
    size: 120,
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: ({ getValue }) => {
      const priority = getValue();
      const config = getPriorityConfig(priority);
      return (
        <Chip color={config.color} variant="flat" size="sm">
          {config.label}
        </Chip>
      );
    },
    size: 120,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
    cell: ({ getValue }) => <span>{getValue() ?? '—'}</span>,
    size: 150,
  }),
  columnHelper.accessor('assigneeName', {
    header: 'Assignee',
    cell: ({ getValue }) => <span>{getValue() ?? 'Unassigned'}</span>,
    size: 150,
  }),
  columnHelper.accessor('requesterName', {
    header: 'Requester',
    cell: ({ getValue }) => <span>{getValue() ?? '—'}</span>,
    size: 150,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: ({ getValue }) => {
      const date = getValue();
      return <span className="text-sm">{new Date(date).toLocaleDateString()}</span>;
    },
    size: 120,
  }),
  columnHelper.accessor('modifiedAt', {
    header: 'Updated',
    cell: ({ getValue }) => {
      const date = getValue();
      return <span className="text-sm">{date ? new Date(date).toLocaleDateString() : '-'}</span>;
    },
    size: 120,
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <PermissionGuard requiredPermissions={[HelpdeskPermissions.TicketWrite]} fallback={null}>
        <Dropdown>
          <DropdownTrigger>
            <BaseButton
              variant="link"
              size="none"
              className="text-foreground hover:text-blue"
              aria-label="Quick actions"
              icon={<Icon name="ellipsis-vertical" className="h-4 w-4" />}
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="Ticket actions">
            <DropdownItem
              key="assign"
              onPress={() => {
                // TODO: Open assign modal
              }}
            >
              Assign
            </DropdownItem>
            <DropdownItem
              key="status"
              onPress={() => {
                // TODO: Open status change modal
              }}
            >
              Change Status
            </DropdownItem>
            <DropdownItem
              key="priority"
              onPress={() => {
                // TODO: Open priority change modal
              }}
            >
              Change Priority
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </PermissionGuard>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 80,
  }),
];
