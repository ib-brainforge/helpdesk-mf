import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { NavLink } from '@modern-js/runtime/router';
import { StatusBadge, UserCell } from '@/components/shared';
import type { PlatformTicketListItem, PlatformTicketStatus, PlatformTicketPriority } from '@/types/admin';
import type { UserInfo } from '@/hooks/useUserEnrichment';

export type PlatformTicketRow = PlatformTicketListItem & {
  submitterUserInfo?: UserInfo | null;
  assigneeUserInfo?: UserInfo | null;
};

const columnHelper = createColumnHelper<PlatformTicketRow>();

const getStatusConfig = (status: PlatformTicketStatus) => {
  switch (status) {
    case 'Open':
      return { label: 'Open', color: 'primary' as const };
    case 'InProgress':
      return { label: 'In Progress', color: 'warning' as const };
    case 'Resolved':
      return { label: 'Resolved', color: 'success' as const };
    case 'Closed':
      return { label: 'Closed', color: 'default' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const getPriorityConfig = (priority: PlatformTicketPriority) => {
  switch (priority) {
    case 'Critical':
      return { label: 'Critical', color: 'danger' as const };
    case 'High':
      return { label: 'High', color: 'warning' as const };
    case 'Medium':
      return { label: 'Medium', color: 'primary' as const };
    case 'Low':
      return { label: 'Low', color: 'default' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

export const createPlatformTicketColumns = (): ColumnDef<PlatformTicketRow, any>[] => [
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
      const shortId = value?.substring(0, 8) ?? '—';
      return <span className="font-mono text-xs">{shortId}</span>;
    },
    size: 100,
  }),
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: ({ getValue, row }) => (
      <NavLink
        to={`/admin/platform-tickets/${row.original.id}`}
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
      const config = getStatusConfig(getValue());
      return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
    },
    size: 120,
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: ({ getValue }) => {
      const config = getPriorityConfig(getValue());
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
    id: 'submitter',
    header: 'Submitter',
    cell: ({ row }) => {
      const { submitterUserInfo, submitterEmail } = row.original;
      return (
        <UserCell
          userInfo={submitterUserInfo}
          fallbackName={submitterEmail}
        />
      );
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
      return (
        <UserCell
          userInfo={row.original.assigneeUserInfo}
          fallbackName="Assigned"
        />
      );
    },
    size: 200,
  }),
  columnHelper.accessor('submitterTenantName', {
    header: 'Tenant',
    cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
    size: 180,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: ({ getValue }) => (
      <span className="text-sm">{new Date(getValue()).toLocaleDateString()}</span>
    ),
    size: 120,
  }),
  columnHelper.accessor('modifiedAt', {
    header: 'Updated',
    cell: ({ getValue }) => {
      const date = getValue();
      return <span className="text-sm">{date ? new Date(date).toLocaleDateString() : '—'}</span>;
    },
    size: 120,
  }),
];
