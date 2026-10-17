import { ScopeCell, StatusBadge, UserCell } from '@/components/shared';
import { HelpdeskPermissions } from '@/constants/permissions';
import type { UseScopeNamesResult } from '@/hooks/useScopeNames';
import type { UserInfo } from '@/hooks/useUserEnrichment';
import {
  type CustomTicketStatusDto,
  buildStatusOptions,
  resolveStatusKey,
} from '@/types/custom-status';
import { TicketPriority, TicketStatus } from '@/types/ticket';
import { BaseButton, Icon } from '@brainforgeau/components';
import { formatDateTime } from '@brainforgeau/components/utils';
import { PermissionGuard } from '@brainforgeau/security';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@heroui/react';
import { NavLink } from '@modern-js/runtime/router';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { getPriorityConfig } from '../ticket-priority-config';
import { getStatusConfig } from '../ticket-status-config';
import type { TicketRow } from '../types';
import { QuickAssignCell } from './QuickAssignCell';

const columnHelper = createColumnHelper<TicketRow>();

/** One day in seconds — the cutoff between relative and absolute display. */
const RELATIVE_CUTOFF_SECONDS = 24 * 60 * 60;

/**
 * Renders one timestamp: an age for the first 24 hours, an absolute date after.
 *
 * Within a day "20m ago" answers the question directly, whereas a clock time
 * makes you work out the difference yourself. Past 24 hours the age stops being
 * useful ("37h ago" is not meaningfully easier than a date) and the calendar
 * date is what people actually reference, so it switches over.
 *
 * The exact timestamp is always available via the title attribute, including
 * during the relative window, so nothing is hidden.
 *
 * Anything unparseable, or dated in the future (clock skew), falls back to the
 * absolute format rather than rendering a nonsensical age.
 */
const formatAge = (
  date: string | Date | null | undefined,
  timezone?: string | null,
) => {
  const absolute = formatDateTime(date, { timezone });
  const parsed = date ? new Date(date) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { label: absolute, absolute };
  }

  const seconds = Math.floor((Date.now() - parsed.getTime()) / 1000);

  if (seconds < 0 || seconds >= RELATIVE_CUTOFF_SECONDS) {
    return { label: absolute, absolute };
  }

  const label =
    seconds < 60
      ? 'just now'
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ago`
        : `${Math.floor(seconds / 3600)}h ago`;

  return { label, absolute };
};

/**
 * One timestamp, in its own column.
 *
 * An earlier attempt stacked Created and Updated in a single cell to save
 * width. It read as two identical unlabelled times ("20h ago" over "20h ago")
 * with only the shared "Created / Updated" header to tell you which was which
 * — compact, but a puzzle. A column header sitting directly above its value is
 * what anyone expects of a table and needs no decoding, so the width is spent
 * and the narrow-window rules in TicketGrid give it back.
 */
const TimeCell = ({
  date,
  timezone,
  isOverdue = false,
}: {
  date: string | Date | null | undefined;
  // Matches createTicketColumns' options.timezone, which is nullable.
  timezone?: string | null;
  /** Marks the ticket as past its due date and still open. */
  isOverdue?: boolean;
}) => {
  if (!date) return <span className="text-default-400 text-sm">—</span>;
  const { label, absolute } = formatAge(date, timezone);
  return (
    <span
      title={isOverdue ? `${absolute} — overdue` : absolute}
      className={`text-sm ${isOverdue ? 'text-red-dark font-semibold' : ''}`}
    >
      {label}
    </span>
  );
};

/**
 * Past its due date and not yet closed.
 *
 * Reads dueDate rather than measuring the ticket's age, so it agrees with the
 * backend: the Overdue tab, the Overdue report and the OverdueCondition
 * automation trigger all key off the same field. Computing an age here instead
 * would have produced a second, competing definition of overdue that silently
 * disagreed with the tab claiming to list them.
 *
 * A closed ticket is never overdue, however late it was.
 */
const isTicketOverdue = (row: TicketRow) =>
  !!row.dueDate &&
  row.status !== TicketStatus.Closed &&
  new Date(row.dueDate).getTime() < Date.now();

// Helper functions for status and priority display

interface CreateColumnsOptions {
  /** `null` unassigns. */
  onAssign?: (ticketId: string, assigneeId: string | null) => void;
  /** Signed in user, so the assignee cell can offer "Assign to me" first. */
  currentUserId?: string;
  /**
   * `customStatusId` is null for a built-in status, which detaches whatever
   * custom status the ticket was on.
   */
  onChangeStatus?: (
    ticketId: string,
    status: TicketStatus,
    customStatusId: string | null,
  ) => void;
  /** Tenant-defined statuses to offer alongside the built-in three. */
  customStatuses?: CustomTicketStatusDto[];
  onChangePriority?: (ticketId: string, priority: TicketPriority) => void;
  timezone?: string | null;
  /**
   * Resolved tenant and organisation names. Omit to leave the Scope column out
   * entirely, which is what callers without a `useScopeNames()` result get.
   */
  scopeNames?: UseScopeNamesResult;
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
        className="h-4 w-4 rounded border-default-300 text-primary focus:ring-primary"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="h-4 w-4 rounded border-default-300 text-primary focus:ring-primary"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 44,
  }),
  columnHelper.accessor('id', {
    header: 'ID',
    cell: ({ getValue }) => {
      const value = getValue();
      // Display short ID (first 8 characters)
      const shortId = value?.substring(0, 8) ?? '—';
      return <span className="font-mono text-xs">{shortId}</span>;
    },
    size: 70,
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
    size: 230,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue();
      const config = getStatusConfig(status);
      return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
    },
    size: 104,
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: ({ getValue }) => {
      const priority = getValue();
      const config = getPriorityConfig(priority);
      return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
    },
    size: 96,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
    cell: ({ getValue }) => <span>{getValue() ?? '—'}</span>,
    size: 100,
  }),
  /*
   * Where the ticket sits: tenant above, organisation below.
   *
   * Both are shown even though this grid is pinned to one tenant by a global
   * query filter, so the tenant line repeats down the column. That is the
   * point: scope is one fact and it is read whole, and matching the principal
   * console means the column means the same thing wherever it appears.
   */
  ...(options.scopeNames
    ? [
        columnHelper.display({
          id: 'scope',
          header: 'Scope',
          cell: ({ row }) => (
            <ScopeCell
              tenantId={row.original.tenantId}
              organisationId={row.original.organisationId}
              names={options.scopeNames as UseScopeNamesResult}
            />
          ),
          size: 160,
        }),
      ]
    : []),
  columnHelper.display({
    id: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => {
      const { assigneeUserInfo, assigneeName } = row.original;
      if (!row.original.assigneeId) {
        // "Unassigned" was a dead label sitting exactly where someone would
        // click to fix it. It is now the assign control itself.
        return options.onAssign && row.original.id ? (
          <QuickAssignCell
            ticketId={row.original.id}
            currentUserId={options.currentUserId}
            tenantId={row.original.tenantId}
            organisationId={row.original.organisationId}
            divisionId={row.original.divisionId}
            onAssign={options.onAssign}
          />
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        );
      }
      // No 'Assigned' literal: the API returns assigneeName null whenever the
      // id cannot be resolved, and passing a stand-in made a lookup failure
      // render as a person's name. UserCell states it plainly instead.
      return (
        <UserCell userInfo={assigneeUserInfo} fallbackName={assigneeName} />
      );
    },
    size: 152,
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
        <UserCell userInfo={requesterUserInfo} fallbackName={requesterName} />
      );
    },
    size: 152,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: ({ getValue, row }) => (
      <TimeCell
        date={getValue()}
        timezone={options.timezone}
        isOverdue={isTicketOverdue(row.original)}
      />
    ),
    size: 100,
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: ({ getValue }) => (
      <TimeCell date={getValue()} timezone={options.timezone} />
    ),
    size: 100,
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <PermissionGuard
        requiredPermissions={[HelpdeskPermissions.TicketWrite]}
        fallback={null}
      >
        <Dropdown>
          <DropdownTrigger
            aria-label="Quick actions"
            className="text-gray hover:bg-light-blue hover:text-blue focus:ring-blue mx-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2"
          >
            <Icon name="dots" className="h-4 w-4" />
          </DropdownTrigger>
          <DropdownPopover className="helpdesk-dropdown-popover">
            <DropdownMenu aria-label="Ticket actions">
              <DropdownItem
                key="assign"
                onPress={() => {
                  // REVIEW: Using inline prompt for quick assign - proper modal would be better UX
                  const assigneeId = prompt(
                    'Enter user ID to assign (or leave empty to unassign):',
                  );
                  if (
                    assigneeId !== null &&
                    options.onAssign &&
                    row.original.id
                  ) {
                    // An empty prompt means unassign, which has to be null:
                    // an empty string is falsy and was silently dropped.
                    options.onAssign(row.original.id, assigneeId || null);
                  }
                }}
              >
                Assign
              </DropdownItem>
              {/*
                Built-in statuses and tenant-defined ones in one list. This
                menu offered only the built-in three, so a custom status could
                be applied from the ticket page but not from the grid.
              */}
              {buildStatusOptions(
                options.customStatuses ?? [],
                row.original.customStatusId,
              ).map(opt => (
                <DropdownItem
                  key={`status-${opt.key}`}
                  onPress={() => {
                    if (!options.onChangeStatus || !row.original.id) return;
                    const resolved = resolveStatusKey(
                      opt.key,
                      options.customStatuses ?? [],
                    );
                    if (!resolved) return;
                    options.onChangeStatus(
                      row.original.id,
                      resolved.status as TicketStatus,
                      resolved.customStatusId,
                    );
                  }}
                >
                  {/*
                    Every status reads the same way. Custom ones used to render
                    bare, so a tenant status sat among "Mark as New" / "Mark as
                    In Progress" as just "try it out", which looks like a
                    different kind of thing entirely rather than the fourth
                    option in the same list.
                  */}
                  {`Mark as ${opt.label}`}
                </DropdownItem>
              ))}
              <DropdownItem
                key="priority-critical"
                onPress={() => {
                  if (options.onChangePriority && row.original.id) {
                    options.onChangePriority(
                      row.original.id,
                      TicketPriority.Critical,
                    );
                  }
                }}
              >
                Set Priority: Critical
              </DropdownItem>
              <DropdownItem
                key="priority-high"
                onPress={() => {
                  if (options.onChangePriority && row.original.id) {
                    options.onChangePriority(
                      row.original.id,
                      TicketPriority.High,
                    );
                  }
                }}
              >
                Set Priority: High
              </DropdownItem>
            </DropdownMenu>
          </DropdownPopover>
        </Dropdown>
      </PermissionGuard>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 60,
  }),
];
