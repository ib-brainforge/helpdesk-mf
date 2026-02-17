/**
 * Unified ticket column definitions for all sources (regular, platform, tenant)
 *
 * Phase 2: Frontend Unification
 * Single column factory that adapts based on ticket source
 */

import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { NavLink } from '@modern-js/runtime/router';
import { StatusBadge, UserCell } from '@/components/shared';
import type { UnifiedTicketListItem, TicketSource } from '@/types/unified-ticket';
import { SOURCE_CAPABILITIES } from '@/types/unified-ticket';
import { getStatusConfig, getPriorityConfig } from '@/utils/ticketDisplayHelpers';
import type { UserInfo } from '@/hooks/useUserEnrichment';

/**
 * Extended row type with enriched user data
 */
export type UnifiedTicketRow = UnifiedTicketListItem & {
  // User enrichment
  requesterUserInfo?: UserInfo | null;
  assigneeUserInfo?: UserInfo | null;
  submitterUserInfo?: UserInfo | null; // Platform only
};

const columnHelper = createColumnHelper<UnifiedTicketRow>();

/**
 * Create column definitions based on ticket source
 *
 * @param source - Ticket source type
 * @returns Array of column definitions adapted for the source
 */
export const createUnifiedColumns = (source: TicketSource): ColumnDef<UnifiedTicketRow, any>[] => {
  const capabilities = SOURCE_CAPABILITIES[source];

  const columns: ColumnDef<UnifiedTicketRow, any>[] = [];

  // Selection checkbox (if source supports editing)
  if (capabilities.canEdit || capabilities.canAssign) {
    columns.push(
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
      })
    );
  }

  // ID column (common)
  columns.push(
    columnHelper.accessor('id', {
      header: 'ID',
      cell: ({ getValue }) => {
        const value = getValue();
        const shortId = value?.substring(0, 8) ?? '—';
        return <span className="font-mono text-xs">{shortId}</span>;
      },
      size: 100,
    })
  );

  // Subject column (common, with unread indicator for regular tickets)
  columns.push(
    columnHelper.accessor('subject', {
      header: 'Subject',
      cell: ({ getValue, row }) => {
        const value = getValue();
        const unread = source === 'regular' ? row.original.unreadForAgent : false;
        const detailPath =
          source === 'platform'
            ? `/tickets/platform/${row.original.id}`
            : `/tickets/${row.original.id}`;

        return (
          <div className="flex items-center gap-2">
            {unread && (
              <span className="flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            <NavLink
              to={detailPath}
              className="font-medium text-foreground hover:text-blue hover:underline"
            >
              {value ?? 'Untitled Ticket'}
            </NavLink>
          </div>
        );
      },
      size: 300,
    })
  );

  // Status column (common)
  columns.push(
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => {
        const config = getStatusConfig(getValue());
        return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
      },
      size: 120,
    })
  );

  // Priority column (common)
  columns.push(
    columnHelper.accessor('priority', {
      header: 'Priority',
      cell: ({ getValue }) => {
        const config = getPriorityConfig(getValue());
        return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
      },
      size: 120,
    })
  );

  // Category column (common)
  columns.push(
    columnHelper.accessor('categoryName', {
      header: 'Category',
      cell: ({ getValue }) => <span>{getValue() ?? '—'}</span>,
      size: 150,
    })
  );

  // Submitter column (platform only)
  if (source === 'platform') {
    columns.push(
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
      })
    );
  }

  // Requester column (regular tickets only)
  if (source === 'regular') {
    columns.push(
      columnHelper.display({
        id: 'requester',
        header: 'Requester',
        cell: ({ row }) => {
          const { requesterUserInfo, requesterId } = row.original;
          if (!requesterId) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <UserCell
              userInfo={requesterUserInfo}
              fallbackName="Unknown"
            />
          );
        },
        size: 200,
      })
    );
  }

  // Assignee column (common)
  columns.push(
    columnHelper.display({
      id: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => {
        const { assigneeUserInfo, assigneeId } = row.original;
        if (!assigneeId) {
          return <span className="text-sm text-muted-foreground">Unassigned</span>;
        }
        return (
          <UserCell
            userInfo={assigneeUserInfo}
            fallbackName="Assigned"
          />
        );
      },
      size: 200,
    })
  );

  // Tenant column (platform only)
  if (source === 'platform') {
    columns.push(
      columnHelper.accessor('submitterTenantName', {
        header: 'Tenant',
        cell: ({ getValue }) => <span className="text-sm">{getValue() ?? '—'}</span>,
        size: 180,
      })
    );
  }

  // Created date column (common)
  columns.push(
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: ({ getValue }) => {
        const date = getValue();
        return <span className="text-sm">{date ? new Date(date).toLocaleDateString() : '—'}</span>;
      },
      size: 120,
    })
  );

  // Updated date column (common, using aligned field name 'modifiedAt')
  columns.push(
    columnHelper.accessor('modifiedAt', {
      header: 'Updated',
      cell: ({ getValue }) => {
        const date = getValue();
        return <span className="text-sm">{date ? new Date(date).toLocaleDateString() : '—'}</span>;
      },
      size: 120,
    })
  );

  return columns;
};
