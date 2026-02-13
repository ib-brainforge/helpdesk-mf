import { BaseButton, Icon } from '@brainforgeau/components';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { NavLink } from '@modern-js/runtime/router';
import type { UsersRow } from '../types';
import { StatusBadge } from '@/components/shared';
import { HelpdeskUserRole } from '@/types/user';

const columnHelper = createColumnHelper<UsersRow>();

interface CreateColumnsOptions {
  onChangeRole?: (userId: string) => void;
  onToggleDisabled?: (userId: string) => void;
}

// REVIEW: Helper function to get role display name
const getRoleDisplayName = (role: HelpdeskUserRole): string => {
  const roleMap: Record<HelpdeskUserRole, string> = {
    [HelpdeskUserRole.Customer]: 'Customer',
    [HelpdeskUserRole.Manager]: 'Manager',
    [HelpdeskUserRole.Technician]: 'Technician',
    [HelpdeskUserRole.Admin]: 'Admin',
  };
  return roleMap[role] || 'Unknown';
};

// REVIEW: Helper function to get role chip color
const getRoleColor = (role: HelpdeskUserRole) => {
  const colors: Record<HelpdeskUserRole, 'default' | 'primary' | 'secondary' | 'success'> = {
    [HelpdeskUserRole.Customer]: 'default',
    [HelpdeskUserRole.Manager]: 'secondary',
    [HelpdeskUserRole.Technician]: 'primary',
    [HelpdeskUserRole.Admin]: 'success',
  };
  return colors[role] || 'default';
};

export const createUsersColumns = (options: CreateColumnsOptions): ColumnDef<UsersRow, any>[] => [
  columnHelper.display({
    id: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <NavLink
          to={`/users/${user.id}`}
          className="font-medium text-foreground hover:text-blue hover:underline"
        >
          {user.name || 'Unknown User'}
        </NavLink>
      );
    },
    size: 200,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: ({ getValue }) => getValue() || <span className="text-default-400">—</span>,
    size: 220,
  }),
  columnHelper.accessor('role', {
    header: 'Role',
    cell: ({ getValue }) => {
      const role = getValue();
      return (
        <StatusBadge
          color={getRoleColor(role)}        >
          {getRoleDisplayName(role)}
        </StatusBadge>
      );
    },
    size: 120,
  }),
  columnHelper.accessor('lastSeenAt', {
    header: 'Last Seen',
    cell: ({ getValue }) => {
      const lastSeen = getValue();
      if (!lastSeen) return <span className="text-default-400">Never</span>;

      // REVIEW: Format date - can enhance with date-fns if needed
      const date = new Date(lastSeen);
      return (
        <span className="text-sm">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    },
    size: 160,
  }),
  columnHelper.accessor('isDisabled', {
    header: 'Status',
    cell: ({ getValue }) => {
      const isDisabled = getValue();
      return (
        <StatusBadge
          color={isDisabled ? 'default' : 'success'}        >
          {isDisabled ? 'Disabled' : 'Active'}
        </StatusBadge>
      );
    },
    size: 100,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <BaseButton
          as={NavLink}
          href={`/users/${row.original.id}`}
          variant="link"
          size="none"
          className="text-foreground hover:text-blue"
          aria-label="Edit user"
          icon={<Icon name="pencil" className="h-4 w-4" />}
        />
        <BaseButton
          variant="link"
          size="none"
          className="text-foreground hover:text-blue"
          aria-label={row.original.isDisabled ? 'Enable user' : 'Disable user'}
          onPress={() => row.original.id && options?.onToggleDisabled?.(row.original.id)}
          icon={<Icon name={row.original.isDisabled ? 'check-circle' : 'x-circle'} className="h-4 w-4" />}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 80,
  }),
];
