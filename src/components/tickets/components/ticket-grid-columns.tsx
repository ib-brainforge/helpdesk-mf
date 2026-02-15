import { BaseButton, Icon } from '@brainforgeau/components';
import { PermissionGuard } from '@brainforgeau/security';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { NavLink } from '@modern-js/runtime/router';
import type { TicketRow } from '../types';
import { TicketStatus, TicketPriority } from '@/types/ticket';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { StatusBadge, UserCell } from '@/components/shared';
import { HelpdeskPermissions } from '@/constants/permissions';
import type { UserInfo } from '@/hooks/useUserEnrichment';

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
        <StatusBadge color={config.color}>
          {config.label}
        </StatusBadge>
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
        <StatusBadge color={config.color}>
          {config.label}
        </StatusBadge>
      );
    },
    size: 120,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
    cell: ({ getValue }) => <span>{getValue() ?? '—'}</span>,
    size: 150,
  }),
  columnHelper.display({
    id: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => {
      const { assigneeUserInfo, assigneeName } = row.original;
      if (!row.original.assigneeId) {
        return <span className="text-sm text-muted-foreground">Unassigned</span>;
      }
      return (
        <UserCell
          userInfo={assigneeUserInfo}
          fallbackName={assigneeName ?? 'Assigned'}
        />
      );
    },
    size: 200,
  }),
  columnHelper.display({
    id: 'requester',
    header: 'Requester',
    cell: ({ row }) => {
      const { requesterUserInfo, requesterName } = row.original;
      if (!row.original.requesterId) {
        return <span className="text-sm text-muted-foreground">—</span>;
      }
      return (
        <UserCell
          userInfo={requesterUserInfo}
          fallbackName={requesterName ?? 'Unknown'}
        />
      );
    },
    size: 200,
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
              icon={<Icon name="dotsV" className="h-4 w-4" />}
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="Ticket actions">
            <DropdownItem
              key="assign"
              onPress={() => {
                // REVIEW: Using inline prompt for quick assign - proper modal would be better UX
                const assigneeId = prompt('Enter user ID to assign (or leave empty to unassign):');
                if (assigneeId !== null && options.onAssign && row.original.id) {
                  options.onAssign(row.original.id, assigneeId);
                }
              }}
            >
              Assign
            </DropdownItem>
            <DropdownItem
              key="status-new"
              onPress={() => {
                if (options.onChangeStatus && row.original.id) {
                  options.onChangeStatus(row.original.id, TicketStatus.New);
                }
              }}
            >
              Mark as New
            </DropdownItem>
            <DropdownItem
              key="status-inprogress"
              onPress={() => {
                if (options.onChangeStatus && row.original.id) {
                  options.onChangeStatus(row.original.id, TicketStatus.InProgress);
                }
              }}
            >
              Mark as In Progress
            </DropdownItem>
            <DropdownItem
              key="status-closed"
              onPress={() => {
                if (options.onChangeStatus && row.original.id) {
                  options.onChangeStatus(row.original.id, TicketStatus.Closed);
                }
              }}
            >
              Close Ticket
            </DropdownItem>
            <DropdownItem
              key="priority-critical"
              onPress={() => {
                if (options.onChangePriority && row.original.id) {
                  options.onChangePriority(row.original.id, TicketPriority.Critical);
                }
              }}
            >
              Set Priority: Critical
            </DropdownItem>
            <DropdownItem
              key="priority-high"
              onPress={() => {
                if (options.onChangePriority && row.original.id) {
                  options.onChangePriority(row.original.id, TicketPriority.High);
                }
              }}
            >
              Set Priority: High
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
