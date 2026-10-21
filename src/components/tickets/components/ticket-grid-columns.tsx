import {
  DeadlineChip,
  IconTip,
  StatusBadge,
  UserCell,
  getDeadlineState,
} from '@/components/shared';
import { formatDateTimeAmPm } from '@/components/shared/deadline';
import type { UseScopeNamesResult } from '@/hooks/useScopeNames';
import type { UserInfo } from '@/hooks/useUserEnrichment';
import {
  type CustomTicketStatusDto,
  buildStatusOptions,
  customStatusesApply,
  resolveStatusKey,
} from '@/types/custom-status';
import { TicketPriority, type TicketStatus } from '@/types/ticket';
import { BaseButton, Icon } from '@brainforgeau/components';
import { formatDateTime } from '@brainforgeau/components/utils';
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

/** Category's fixed width in px; everything but Subject fits its content. */
const CATEGORY_WIDTH = 180;

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
    // No seconds in the cell ("06/10/2026 9:29 am"): they cost a column's
    // width on every row and nobody triages by them. The title keeps them.
    return {
      label: formatDateTimeAmPm(parsed.toISOString(), timezone),
      absolute,
    };
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
 * what anyone expects of a table and needs no decoding, so the width is spent.
 */
const TimeCell = ({
  date,
  timezone,
}: {
  date: string | Date | null | undefined;
  // Matches createTicketColumns' options.timezone, which is nullable.
  timezone?: string | null;
}) => {
  if (!date) return <span className="text-default-400 text-sm">—</span>;
  const { label, absolute } = formatAge(date, timezone);
  return (
    <span title={absolute} className="text-sm">
      {label}
    </span>
  );
};

/**
 * Open and past its next deadline (the first reply until there is one, then
 * the fix). Read from the backend's deadline instants, so the red row marker,
 * the chip and the Overdue tab all agree on one definition.
 */
export const isTicketOverdue = (row: TicketRow, now: number = Date.now()) =>
  getDeadlineState(row.deadline, now) === 'overdue';

/** A plain single-line cell. The column is as wide as its text. */
const TextCell = ({ value }: { value?: string | null }) =>
  value ? (
    <span className="block text-sm" title={value}>
      {value}
    </span>
  ) : null;

const ORIGIN_LABELS: Record<string, string> = {
  Web: 'Web',
  WebApp: 'Web',
  Email: 'Email',
  Api: 'API',
};

// Helper functions for status and priority display

interface CreateColumnsOptions {
  /** `null` unassigns. */
  onAssign?: (ticketId: string, assigneeId: string | null) => void;
  /** May edit tickets: shows the row menu. */
  canWrite?: boolean;
  /** Opens the assignee picker for one row (the row menu's Assign). */
  onOpenAssign?: (ticket: TicketRow) => void;
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
  /**
   * The company those custom statuses belong to (the viewer's). Another
   * company's row is offered the built-in three only: the backend refuses a
   * custom status from a different company.
   */
  customStatusTenantId?: string;
  onChangePriority?: (ticketId: string, priority: TicketPriority) => void;
  timezone?: string | null;
  /** Resolved company (tenant) and organisation names for their columns. */
  scopeNames: UseScopeNamesResult;
}

/*
 * Column ids, in the default order, and the ones hidden until a user shows
 * them in the Columns chooser. TicketGrid's layout reads these, so a column
 * added here appears in the chooser without further wiring.
 */
export const TICKET_COLUMN_LABELS: Record<string, string> = {
  subject: 'Subject',
  company: 'Company',
  deadline: 'Deadline',
  assignee: 'Assignee',
  requester: 'Requester',
  status: 'Status',
  priority: 'Priority',
  categoryName: 'Category',
  createdAt: 'Created',
  updatedAt: 'Updated',
  origin: 'Via',
  id: 'ID',
};
/*
 * Status and Priority are on every row already, under the subject. Their own
 * columns stay in the chooser because they are how to sort by status or
 * priority; turning one on drops that chip from under the subject, so it is
 * never shown twice.
 */
export const TICKET_DEFAULT_HIDDEN = [
  'status',
  'priority',
  'categoryName',
  'createdAt',
  'updatedAt',
  'origin',
  'id',
];
/** Muted notes beside hidden columns in the chooser. */
export const TICKET_COLUMN_HINTS: Record<string, string> = {
  status: '(shown under Subject)',
  priority: '(shown under Subject)',
};
/**
 * Column id to the backend's SortBy key. Only these sort, because only these
 * sort on the server across every page; names resolved in the browser
 * (company, organisation, people, category) cannot.
 */
export const TICKET_SORT_KEYS: Record<string, string> = {
  subject: 'subject',
  status: 'status',
  priority: 'priority',
  deadline: 'deadline',
  createdAt: 'createdat',
  updatedAt: 'modifiedat',
};
const sortable = (id: string) => id in TICKET_SORT_KEYS;

const scopeName = (
  id: string | null | undefined,
  lookup: (id: string) => string | undefined,
) => (id ? (lookup(id) ?? `${id.substring(0, 8)}...`) : null);

export const createTicketColumns = (
  options: CreateColumnsOptions,
): ColumnDef<TicketRow, any>[] => [
  // Checkbox column for bulk actions
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Select all tickets on this page"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="h-4 w-4 rounded border-default-300 text-primary focus:ring-primary"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label="Select ticket"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="h-4 w-4 rounded border-default-300 text-primary focus:ring-primary"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 36,
  }),
  /*
   * Two slim lines: the subject, then its status and priority as small chips.
   * A chip whose own column is switched on is left out here, so nothing shows
   * twice; with both on the row is back to one line.
   */
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: ({ getValue, row, table }) => {
      const value = getValue() ?? 'Untitled Ticket';
      const unread = row.original.unreadForAgent;
      const showStatus = !table.getColumn('status')?.getIsVisible();
      const showPriority = !table.getColumn('priority')?.getIsVisible();
      const status = getStatusConfig(row.original.status as TicketStatus);
      const priority = getPriorityConfig(
        row.original.priority as TicketPriority,
      );
      return (
        <div className="flex min-w-0 flex-col gap-1">
          {/*
            The unread dot sits in the cell's left padding, out of the flow,
            so the subject and the chips under it share one left edge.
          */}
          <div className="relative flex min-w-0 items-center">
            {unread && (
              <span className="absolute top-1/2 -left-[9px] flex h-2 w-2 -translate-y-1/2">
                <span className="animate-pulse absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            <NavLink
              to={`/tickets/${row.original.id}`}
              // The ticket page runs in the ticket's own company.
              state={{ tenantId: row.original.tenantId }}
              title={value}
              className="min-w-0 truncate text-[13px] leading-[18px] font-medium text-foreground hover:text-blue hover:underline"
            >
              {value}
            </NavLink>
          </div>
          {(showStatus || showPriority) && (
            <div className="flex items-center gap-1">
              {showStatus && (
                <StatusBadge color={status.color} size="sm">
                  {status.label}
                </StatusBadge>
              )}
              {showPriority && (
                <StatusBadge color={priority.color} size="sm">
                  {priority.label}
                </StatusBadge>
              )}
            </div>
          )}
        </div>
      );
    },
    enableSorting: sortable('subject'),
    size: 334,
    minSize: 220,
  }),
  /*
   * Company above, organisation muted beneath it in the same slim two-line
   * rhythm as the subject. The organisation is left out when it carries the
   * company's own name.
   */
  columnHelper.display({
    id: 'company',
    header: 'Company',
    cell: ({ row }) => {
      const company = scopeName(
        row.original.tenantId,
        id => options.scopeNames.byTenantId.get(id)?.tenantName,
      );
      const organisation = scopeName(row.original.organisationId, id =>
        options.scopeNames.byOrganisationId.get(id),
      );
      return (
        <div className="flex flex-col gap-1 text-xs leading-4">
          {company && (
            <span className="font-medium text-foreground">{company}</span>
          )}
          {organisation && organisation !== company && (
            <span className="text-[#8c8f97]">{organisation}</span>
          )}
        </div>
      );
    },
    enableSorting: false,
    size: 160,
    minSize: 100,
  }),
  columnHelper.display({
    id: 'deadline',
    header: 'Deadline',
    cell: ({ row }) => <DeadlineChip deadline={row.original.deadline} />,
    enableSorting: sortable('deadline'),
    size: 150,
    minSize: 120,
  }),
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
        <UserCell
          userInfo={assigneeUserInfo}
          fallbackName={assigneeName}
          avatarSize="xs"
        />
      );
    },
    enableSorting: false,
    size: 150,
    minSize: 100,
  }),
  columnHelper.display({
    id: 'requester',
    header: 'Requester',
    cell: ({ row }) => {
      const { requesterUserInfo, requesterName } = row.original;
      // An email-only contact has no user account, only a name: it still
      // gets its initials, from that name.
      if (!row.original.requesterId && !requesterName) return null;
      // The same cell as Assignee: the person's picture, or their initials.
      return (
        <UserCell
          userInfo={requesterUserInfo}
          fallbackName={requesterName}
          avatarSize="xs"
        />
      );
    },
    enableSorting: false,
    size: 120,
    minSize: 90,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue();
      const config = getStatusConfig(status);
      return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
    },
    enableSorting: sortable('status'),
    size: 104,
    minSize: 80,
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: ({ getValue }) => {
      const priority = getValue();
      const config = getPriorityConfig(priority);
      return <StatusBadge color={config.color}>{config.label}</StatusBadge>;
    },
    enableSorting: sortable('priority'),
    size: 88,
    minSize: 72,
  }),
  /*
   * The one fixed-width column besides Subject: preset names can be a whole
   * sentence ("Issue with a vehicle's GPS tracking hardware or ability to
   * track"), so they truncate, with the full name on hover.
   */
  columnHelper.accessor('categoryName', {
    header: 'Category',
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? (
        <span className="block truncate text-sm" title={value}>
          {value}
        </span>
      ) : null;
    },
    enableSorting: false,
    size: CATEGORY_WIDTH,
    meta: { fixedWidth: CATEGORY_WIDTH },
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: ({ getValue }) => (
      <TimeCell date={getValue()} timezone={options.timezone} />
    ),
    enableSorting: sortable('createdAt'),
    size: 100,
    minSize: 80,
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: ({ getValue }) => (
      <TimeCell date={getValue()} timezone={options.timezone} />
    ),
    enableSorting: sortable('updatedAt'),
    size: 100,
    minSize: 80,
  }),
  columnHelper.accessor('origin', {
    header: 'Via',
    cell: ({ getValue }) => {
      const origin = getValue() as string | undefined;
      return (
        <TextCell value={origin ? (ORIGIN_LABELS[origin] ?? origin) : null} />
      );
    },
    enableSorting: false,
    size: 80,
    minSize: 60,
  }),
  columnHelper.accessor('id', {
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">
        {getValue()?.substring(0, 8).toUpperCase()}
      </span>
    ),
    enableSorting: false,
    size: 80,
    minSize: 70,
  }),
  columnHelper.display({
    id: 'actions',
    // No visible label: a word wider than the menu button made the column
    // wider than its content or clipped it. Screen readers still hear it.
    header: () => <span className="sr-only">Actions</span>,
    // The permission is checked once for the grid (options.canWrite), not by
    // a guard in every row, which read the token again for each of them.
    cell: ({ row }) =>
      options.canWrite ? (
        <Dropdown>
          <IconTip label="Ticket actions">
            <DropdownTrigger
              aria-label="Ticket actions"
              className="text-gray hover:bg-light-blue hover:text-blue focus:ring-blue flex h-7 w-7 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2"
            >
              <Icon name="dotsV" className="h-4 w-4" />
            </DropdownTrigger>
          </IconTip>
          <DropdownPopover className="helpdesk-dropdown-popover">
            <DropdownMenu aria-label="Ticket actions">
              {/*
                The same picker as bulk assign, for this row: it lists the
                people who can work this ticket's company. This used to be a
                window.prompt asking for a raw user id.
              */}
              {options.onOpenAssign ? (
                <DropdownItem
                  key="assign"
                  onPress={() => options.onOpenAssign?.(row.original)}
                >
                  Assign
                </DropdownItem>
              ) : null}
              {/*
                Built-in statuses and tenant-defined ones in one list. This
                menu offered only the built-in three, so a custom status could
                be applied from the ticket page but not from the grid.
              */}
              {buildStatusOptions(
                customStatusesApply(options.customStatusTenantId, [
                  row.original.tenantId,
                ])
                  ? (options.customStatuses ?? [])
                  : [],
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
              {/* Every priority, not only the two that raise it: lowering
                one from the list was impossible. The current one is left out. */}
              {(
                [
                  [TicketPriority.Critical, 'Critical'],
                  [TicketPriority.High, 'High'],
                  [TicketPriority.Normal, 'Normal'],
                  [TicketPriority.Low, 'Low'],
                ] as const
              )
                .filter(([value]) => value !== row.original.priority)
                .map(([value, label]) => (
                  <DropdownItem
                    key={`priority-${label.toLowerCase()}`}
                    onPress={() => {
                      if (options.onChangePriority && row.original.id) {
                        options.onChangePriority(row.original.id, value);
                      }
                    }}
                  >
                    {`Set priority: ${label}`}
                  </DropdownItem>
                ))}
            </DropdownMenu>
          </DropdownPopover>
        </Dropdown>
      ) : null,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 44,
  }),
];
