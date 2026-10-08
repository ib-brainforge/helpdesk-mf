import type {
  BulkTicketPriority,
  BulkTicketResultDto,
} from '@/api/local/ticket-bulk';
import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { useMinuteTick } from '@/components/shared';
import { ColumnsChooser } from '@/components/shared/table-layout';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { useScopeNames } from '@/hooks/useScopeNames';
import type {
  TicketFilters as TicketFiltersType,
  TicketPriority,
  TicketStatus,
} from '@/types/ticket';
import {
  BaseButton,
  BaseTable,
  Icon,
  TablePagination,
} from '@brainforgeau/components';
import { BaseTab, BaseTabs } from '@brainforgeau/components';
import {
  PermissionGuard,
  usePermissions,
  useTimezone,
} from '@brainforgeau/security';
import { useNavigate, useSearchParams } from '@modern-js/runtime/router';
import {
  type FC,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TICKET_DEFAULT_TAB,
  TICKET_VALID_TABS,
  type TicketTabKey,
  filtersForTab,
  tabForFilters,
} from '../hooks/ticketTabs';
import { useBulkTicketAction } from '../hooks/useBulkTicketAction';
import { useTicketTabCounts } from '../hooks/useTicketTabCounts';
import { useTicketsData } from '../hooks/useTickets';
import { useTicketsLayout } from '../hooks/useTicketsLayout';
import { useTicketsTable } from '../hooks/useTicketsTable';
import { NewRequestModal } from '../new-request/NewRequestModal';
import { BulkAssignModal } from './BulkAssignModal';
import { BulkStatusModal } from './BulkStatusModal';
import { TicketFilters } from './TicketFilters';
import {
  TICKET_SORT_KEYS,
  createTicketColumns,
  isTicketOverdue,
} from './ticket-grid-columns';

import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { usePresetCategories } from '@/components/categories/hooks/usePresetCategories';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { EmptyState, useConfirm } from '@brainforgeau/components/page';
import { useAuth } from '@brainforgeau/security';
import type { TicketRow } from '../types';

export const TicketGrid: FC = () => {
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { user } = useAuth();
  const currentUserId = user?.profile?.sub;
  const [searchTerm, setSearchTerm] = useState('');

  /*
   * Locks this page to the visible viewport so it never scrolls as a whole.
   *
   * This has to be measured rather than expressed in CSS. Nothing above this
   * component has a height: the chain is html > body > div#root >
   * div.flex.flex-1, and every one of those is a plain block box sized by its
   * content. So `h-full` resolves to auto and `flex-1` has no free space to
   * distribute — a tall sidebar simply grows the page. (The theme ships a
   * [data-overlay-container] rule with min-height:100dvh that would have given
   * us a floor, but that element is not rendered in this app — verified by
   * walking the live ancestor chain, not assumed.)
   *
   * `100dvh - <our distance from the top>` is not expressible in CSS either,
   * and hardcoding the navbar height is what the workflow and automation
   * editors were explicitly changed away from (see their REVIEW comments) —
   * it broke the moment the navbar's height changed. Measuring is exact in
   * both the standalone and shell-embedded layouts.
   *
   * The ResizeObserver on <body> is what makes it self-correcting: the navbar
   * mounts lazily via Suspense, which shifts our top edge down, and that
   * changes body's height, which re-triggers the measurement. The 1px
   * threshold stops the observer feeding back into itself forever.
   */
  const gridRootRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState<number>();

  useLayoutEffect(() => {
    const el = gridRootRef.current;
    if (!el) return undefined;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // scrollY keeps this correct even if the page is scrolled when we run.
        const top = el.getBoundingClientRect().top + window.scrollY;
        const next = Math.max(320, Math.round(window.innerHeight - top));
        setGridHeight(prev =>
          prev !== undefined && Math.abs(prev - next) <= 1 ? prev : next,
        );
      });
    };

    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = (() => {
    const param = searchParams.get('tab');
    return param && TICKET_VALID_TABS.has(param) ? param : TICKET_DEFAULT_TAB;
  })();
  const setSelectedTab = useCallback(
    (key: string) => {
      setSearchParams(
        prev => {
          prev.set('tab', key);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  /*
   * The user's saved columns and sort. The first page waits for it (it loads
   * alongside everything else on this page), so the list is fetched once in
   * the right order rather than once by default and again by preference.
   */
  const ticketsLayout = useTicketsLayout(selectedTab);
  const activeSort = ticketsLayout.layout.state.sorting[0];
  const sortBy = activeSort ? TICKET_SORT_KEYS[activeSort.id] : undefined;
  const sort = useMemo(
    () =>
      sortBy
        ? {
            sortBy,
            sortDirection: (activeSort?.desc ? 'desc' : 'asc') as
              | 'asc'
              | 'desc',
          }
        : null,
    [sortBy, activeSort?.desc],
  );

  const {
    items,
    totalCount,
    pagination,
    setPagination,
    filters,
    setFilters,
    isLoading,
    refetch,
  } = useTicketsData(
    // Seeded from the URL so the very first request matches the highlighted tab.
    filtersForTab(
      (() => {
        const param = searchParams.get('tab');
        return param && TICKET_VALID_TABS.has(param)
          ? param
          : TICKET_DEFAULT_TAB;
      })(),
      {},
      user?.profile?.sub,
    ),
    { sort, enabled: ticketsLayout.isReady },
  );

  /*
   * WHO OWNS THE ASSIGNEE FILTER.
   *
   * "Assigned to you" is an assignee filter wearing a tab's clothes: opening it
   * sets `filters.assigneeId` to the current user. So a non-empty assigneeId
   * means one of two completely different things, and almost everything on this
   * screen has to tell them apart:
   *
   *   - the TAB set it for itself  -> not a selection, must not narrow anything
   *     beyond its own tab, and must not survive leaving that tab
   *   - YOU picked it from the rail -> a real filter that narrows the badges and
   *     travels with you across tabs
   *
   * Conflating the two caused three separate bugs: a dead-end where the tab
   * disabled itself, badges that scoped the whole strip to your own queue
   * (All reading 179 against a real 2001), and clicking All afterwards leaving
   * the list still filtered to you.
   */
  const tabOwnsAssignee = selectedTab === 'assigned-to-you';

  // REVIEW: Real-time updates via SignalR - auto-refreshes grid when tickets change
  useRealtimeTickets();

  // Enrich tickets with user data (avatars, names, emails)
  const assigneeIds = items.map(t => t.assigneeId).filter(Boolean);
  const requesterIds = items.map(t => t.requesterId).filter(Boolean);
  const allUserIds = [...assigneeIds, ...requesterIds];
  const { userMap, isLoading: isLoadingUsers } = useUserEnrichment(allUserIds);

  /*
   * Resolve the Category column's label.
   *
   * /v1/tickets returns `categoryId` but no `categoryName` — TicketListDto
   * documents `categoryName` as "a UI-only enrichment field", but nothing ever
   * populated it, so every row rendered the "—" fallback even though all the
   * tickets are categorised. This fills it in the same way assignee and
   * requester names are already enriched above.
   *
   * No extra request: the Category filter on this page reads the same
   * ['helpdesk-categories'] query, so this shares its React Query cache.
   *
   * Deliberately NOT filtered by isActive: a ticket filed under a category
   * that was later deactivated still needs its name shown.
   *
   * The presets are merged in for the same reason the sidebar merges them.
   * /v1/categories returns only Audience=Tenant rows, and tickets raised
   * through the request form sit in the Netcorp categories, which are
   * Audience=Principal. Reading the tenant list alone put every one of those
   * rows back on the "—" fallback, which is exactly the bug this block was
   * written to fix.
   */
  const { categories: ownedCategories } = useCategoriesData();
  const { presets } = usePresetCategories(ownedCategories.map(c => c.id));
  const categoryNameById = useMemo(() => {
    const byId = new Map<string, string>();
    for (const category of [...ownedCategories, ...presets]) {
      if (category.id) byId.set(category.id, category.name);
    }
    return byId;
  }, [ownedCategories, presets]);

  const enrichedItems: TicketRow[] = useMemo(
    () =>
      items.map(ticket => ({
        ...ticket,
        categoryName: ticket.categoryId
          ? categoryNameById.get(ticket.categoryId)
          : undefined,
        assigneeUserInfo: ticket.assigneeId ? userMap[ticket.assigneeId] : null,
        requesterUserInfo: ticket.requesterId
          ? userMap[ticket.requesterId]
          : null,
      })),
    [items, userMap, categoryNameById],
  );

  /*
   * Every write from the list, bulk bar and row actions alike, goes through
   * one request scoped the way the list is read. The per-ticket calls used the
   * app's own company token, so on the all-companies list another company's
   * tickets came back "not found" and nothing was shown.
   */
  const ticketAction = useBulkTicketAction();

  const { confirm, dialog: confirmDialog } = useConfirm();
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);

  const handleAssign = useCallback(
    (ticketId: string, assigneeId: string | null) => {
      ticketAction.mutate({
        ticketIds: [ticketId],
        action: 'Assign',
        assigneeId,
      });
    },
    [ticketAction.mutate],
  );

  // The row menu's Assign opens the same picker as bulk assign, for one row.
  const [assignRow, setAssignRow] = useState<TicketRow | null>(null);

  const handleChangeStatus = useCallback(
    (ticketId: string, status: TicketStatus, customStatusId: string | null) => {
      ticketAction.mutate({
        ticketIds: [ticketId],
        action: 'SetStatus',
        status,
        customStatusId,
      });
    },
    [ticketAction.mutate],
  );

  const handleChangePriority = useCallback(
    (ticketId: string, priority: TicketPriority) => {
      ticketAction.mutate({
        ticketIds: [ticketId],
        action: 'SetPriority',
        // The row menu offers Critical and High only, never None.
        priority: priority as BulkTicketPriority,
      });
    },
    [ticketAction.mutate],
  );

  // Tenant-defined statuses, offered by the row menu alongside the built-in
  // three and applied through the same status patch.
  const { customStatuses } = useCustomStatuses();
  // The company the custom statuses above belong to.
  const { tenantId: viewerTenantId } = useHelpdeskAccess();

  // Tenant and organisation names for the Scope column; tickets carry ids only.
  const scopeNames = useScopeNames();

  // Quick assign on an unassigned row, and assign in the row menu, are both
  // driven by onAssign. Withholding it from people without the assign
  // permission removes both, rather than showing controls the API refuses.
  const { hasPermission } = usePermissions();
  const canAssign = hasPermission(HelpdeskPermissions.TicketAssign);

  const columns = useMemo(
    () =>
      createTicketColumns({
        onAssign: canAssign ? handleAssign : undefined,
        onOpenAssign: canAssign ? setAssignRow : undefined,
        onChangeStatus: handleChangeStatus,
        onChangePriority: handleChangePriority,
        currentUserId,
        timezone,
        scopeNames,
        customStatuses,
        customStatusTenantId: viewerTenantId,
      }),
    [
      canAssign,
      handleAssign,
      handleChangeStatus,
      handleChangePriority,
      currentUserId,
      timezone,
      scopeNames,
      customStatuses,
      viewerTenantId,
    ],
  );

  const { table } = useTicketsTable({
    data: enrichedItems,
    columns,
    totalCount,
    pagination,
    onPaginationChange: setPagination,
    layout: ticketsLayout.layout,
  });

  /*
   * Overdue rows carry a 4px red bar on their first cell. An inset shadow
   * rather than a border, so the row's checkbox stays in line with the rest.
   * The scope-colour rowMarker is not used on Tickets.
   */
  const now = useMinuteTick();
  const getCellClassName = useCallback(
    ({
      row,
      cell,
    }: { row: { original: TicketRow }; cell: { column: { id: string } } }) =>
      // Slim rows: 6px above and below, every cell centred on the row.
      `py-1.5! align-middle ${
        cell.column.id === 'select' && isTicketOverdue(row.original, now)
          ? 'shadow-[inset_4px_0_0_#ae2e24]'
          : ''
      }`,
    [now],
  );

  /*
   * The table area fills whatever height the page-height chain gives it, and
   * the rows scroll inside it. Page size stays a fixed, user-chosen number.
   *
   * THERE IS DELIBERATELY NO HEIGHT MEASUREMENT HERE.
   * A previous version capped this wrapper's maxHeight so the scroll region
   * ended on a whole row rather than slicing the next one in half. BaseTable
   * renders the pagination INSIDE this wrapper, so the cap shrank the footer
   * along with the table and the trimmed remainder reappeared as dead space
   * UNDER the pagination: 89px on a 945px viewport, 63px at 900px. Row heights
   * vary (Subject and Category wrap), so the trim varied too and the gap
   * changed size as you paged.
   *
   * `flex-1` alone reaches the bottom edge exactly. A partially visible last
   * row is ordinary scrolling and is what the other platform grids do; the gap
   * it was trying to avoid was worse than the sliver it avoided.
   */

  /*
   * The badges are scoped by whatever YOU filtered, so each one counts the list
   * you would get by clicking it. The hook strips the tab-owned status fields
   * itself, so passing the live filters does not make the counts refetch on
   * every tab change.
   *
   * The assignee has to be stripped here rather than in the hook, because only
   * this component knows where it came from. On "Assigned to you" the tab sets
   * the assignee for itself, and leaving it in scoped every other badge to your
   * own queue: All read 179 against a real total of 2001, and Overdue 68
   * against 814. The tab you are standing on must not narrow the tabs beside
   * it, or the strip stops being a way to see what else is there.
   */
  const countsFilters = useMemo(
    () => (tabOwnsAssignee ? { ...filters, assigneeId: undefined } : filters),
    [filters, tabOwnsAssignee],
  );
  const { counts } = useTicketTabCounts(currentUserId, countsFilters);

  /*
   * Tab label with its count beside it.
   *
   * The badge is omitted entirely until the counts arrive, rather than showing
   * a 0 or a spinner: a queue tab that reads "0" is a statement about the data,
   * and it should never say that while it simply does not know yet.
   */
  /*
   * Tabs that cannot coexist with a chosen assignee.
   *
   * Both define themselves in terms of a person, so picking one from the rail
   * leaves them asking a contradictory or a redundant question: "unassigned"
   * and "assigned to Zeljko" match nothing together, and "assigned to you" is
   * already an assignee filter that would simply overwrite the choice. Their
   * badges reflect this today by ignoring the rail, which is correct but reads
   * as though the number is stale.
   *
   * Every other tab narrows cleanly by assignee and stays enabled: Unclosed for
   * Zeljko is his New plus In Progress, which is a question worth asking.
   */
  const railAssigneeId = tabOwnsAssignee ? undefined : filters.assigneeId?.[0];

  const isTabDisabled = useCallback(
    (key: TicketTabKey) => {
      // Never dim where you already are: a disabled selected tab is a dead end.
      if (key === selectedTab || !railAssigneeId) return false;
      // "Unassigned" contradicts any chosen person.
      if (key === 'unassigned') return true;
      /*
       * Dimmed for ANY chosen person, your own name included. The rail is
       * already applying an assignee, and this tab would only overwrite it, so
       * offering it would mean two controls fighting over one field. Treating
       * your name as a special case made the rail behave differently depending
       * on whose name you clicked, which is harder to predict than a rule that
       * holds for everyone.
       */
      if (key === 'assigned-to-you') return true;
      return false;
    },
    [railAssigneeId, selectedTab],
  );

  const tabTitle = useCallback(
    (label: string, key: TicketTabKey) => {
      const count = counts?.[key];
      const disabled = isTabDisabled(key);
      return (
        <span
          /*
           * pointer-events-auto is what makes the tooltip appear at all.
           *
           * HeroUI gives a disabled tab `pointer-events: none`, so the browser
           * never hit-tests it, never fires a hover, and a `title` on it is
           * silently dead. A child may re-enable hit-testing even when its
           * parent has it off, so the label opts back in while the tab itself
           * stays disabled and still refuses the click.
           */
          className={`flex items-center gap-1.5 ${
            disabled ? 'pointer-events-auto cursor-not-allowed opacity-40' : ''
          }`}
          title={
            disabled
              ? `${label} ignores the assignee filter. Clear the assignee to use this tab.`
              : undefined
          }
        >
          {label}
          {count !== undefined && (
            /*
             * Fixed width, not shrink-to-fit.
             *
             * tabular-nums already makes every DIGIT the same width, but not
             * every NUMBER: 2001 is four digits and 179 is three, so the badge
             * narrowed and every tab after it slid left. Choosing an assignee
             * changes all six counts at once, so the whole bar jumped sideways
             * at the moment you were reading it.
             *
             * min-w reserves room for the widest count this will realistically
             * show, so the row keeps its geometry whatever the numbers do. The
             * cost is a slightly wide pill around a small number, which is a
             * fair trade for a bar that stays still.
             */
            <span className="bg-lighter-blue text-blue inline-block min-w-[3rem] rounded-full px-1.5 py-0.5 text-center text-xs font-medium tabular-nums">
              {count}
            </span>
          )}
        </span>
      );
    },
    [counts, isTabDisabled],
  );

  const paginationTemplate = useCallback(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    return (
      <TablePagination
        totalPages={totalPages}
        currentPage={pagination.pageIndex + 1}
        onPageChange={(page: number) =>
          setPagination({ ...pagination, pageIndex: page - 1 })
        }
      />
    );
  }, [totalCount, pagination, setPagination]);

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;
  // Keyed on the selected ids, not the rows array, which is rebuilt every
  // render and would otherwise hand the bulk picker a new scope list each time.
  const selectedIdsKey = selectedRows.map(r => r.original.id).join(',');
  const selectedScopes = useMemo(
    () =>
      selectedRows.map(r => ({
        tenantId: r.original.tenantId,
        organisationId: r.original.organisationId,
        divisionId: r.original.divisionId,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIdsKey],
  );
  const assignRowScopes = useMemo(
    () =>
      assignRow
        ? [
            {
              tenantId: assignRow.tenantId,
              organisationId: assignRow.organisationId,
              divisionId: assignRow.divisionId,
            },
          ]
        : null,
    [assignRow],
  );

  const handleBulkAssign = useCallback(() => {
    setIsBulkAssignModalOpen(true);
  }, []);

  const handleBulkChangeStatus = useCallback(() => {
    setIsBulkStatusModalOpen(true);
  }, []);

  // Read when the action runs, so it is always the current selection.
  const selectedIds = useCallback(
    () =>
      table
        .getSelectedRowModel()
        .rows.map(row => row.original.id)
        .filter((id): id is string => !!id),
    [table],
  );

  // After a bulk action only the tickets that failed stay selected, so the
  // user can see which they were and try again.
  const keepFailedSelected = useCallback(
    (result: BulkTicketResultDto) => {
      table.setRowSelection(
        Object.fromEntries(result.failed.map(f => [f.ticketId, true])),
      );
    },
    [table],
  );

  const handleBulkAssignConfirm = useCallback(
    (assigneeId: string | null) => {
      // One row from its menu, or the selection from the bulk bar.
      if (assignRow?.id) {
        handleAssign(assignRow.id, assigneeId);
        return;
      }
      ticketAction.mutate(
        { ticketIds: selectedIds(), action: 'Assign', assigneeId },
        { onSuccess: keepFailedSelected },
      );
    },
    [
      assignRow,
      handleAssign,
      ticketAction.mutate,
      selectedIds,
      keepFailedSelected,
    ],
  );

  const handleBulkStatusConfirm = useCallback(
    (status: TicketStatus, customStatusId: string | null) => {
      ticketAction.mutate(
        {
          ticketIds: selectedIds(),
          action: 'SetStatus',
          status,
          customStatusId,
        },
        { onSuccess: keepFailedSelected },
      );
    },
    [ticketAction.mutate, selectedIds, keepFailedSelected],
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = selectedIds();
    const ok = await confirm({
      title: 'Delete Tickets',
      body: `This action will permanently delete ${ids.length} ticket${ids.length !== 1 ? 's' : ''}. Are you sure you want to continue?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    ticketAction.mutate(
      { ticketIds: ids, action: 'Delete' },
      { onSuccess: keepFailedSelected },
    );
  }, [selectedIds, confirm, ticketAction.mutate, keepFailedSelected]);

  /*
   * Functional update, not `{ ...filters, ... }`.
   *
   * "Clear Filters" calls onFiltersChange({}) and then onSearch(''). Both ran
   * in the same batch, and this one rebuilt from the `filters` value captured
   * when the callback was created — so it put every filter that had just been
   * cleared straight back, and Clear Filters did nothing at all. Reading from
   * `prev` makes the two calls compose instead of race.
   */
  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setFilters(prev => ({ ...prev, searchTerm: term }));
    },
    [setFilters],
  );

  /*
   * "Clear Filters" clears what YOU chose, not which tab you are on.
   *
   * TicketFilters signals a clear by sending `{}`, and this was wired straight
   * to setFilters, so the tab's own definition went with it: on Assigned to you
   * the assignee was dropped while the tab stayed lit, and the rail fell back to
   * "All assignees" beside a header still claiming to show your queue. The same
   * applied everywhere, Unanswered losing its New filter and so on.
   *
   * Re-seeding the tab keeps the highlighted tab an accurate description of the
   * rows under it, which is the invariant the whole tab strip rests on.
   */
  const handleFiltersChange = useCallback(
    (next: TicketFiltersType) => {
      const isClear = Object.keys(next).length === 0;
      if (isClear) {
        setFilters(filtersForTab(selectedTab, {}, currentUserId));
        return;
      }
      // Any other change may stop matching the tab (clearing New from Status
      // on Unanswered, say), so the tab is re-chosen from the filters rather
      // than left lit over rows it no longer describes. See tabForFilters.
      const tab = tabForFilters(next, selectedTab, currentUserId);
      if (tab !== selectedTab) setSelectedTab(tab);
      setFilters(next);
    },
    [setFilters, selectedTab, setSelectedTab, currentUserId],
  );

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      setFilters(prev => ({
        ...prev,
        categoryId: categoryId ? [categoryId] : undefined,
      }));
    },
    [setFilters],
  );

  const handleTabChange = useCallback(
    (key: string | number) => {
      const tabKey = String(key);
      setSelectedTab(tabKey);
      // filtersForTab strips the fields a tab owns and keeps the rest, so the
      // whole filter set is handed over rather than an allowlist of five
      // fields. That allowlist silently dropped the chosen assignee, tenant,
      // organisation and division on every tab click.
      setFilters(prev =>
        filtersForTab(
          tabKey,
          // Drop a tab-owned assignee on the way out. filtersForTab carries
          // assigneeId so a rail choice survives a tab change, but the one
          // "Assigned to you" set for itself belongs to that tab: leaving it in
          // meant clicking All next still listed only your own tickets, under a
          // badge saying 2001.
          tabOwnsAssignee ? { ...prev, assigneeId: undefined } : prev,
          currentUserId,
        ),
      );
    },
    [setFilters, currentUserId, setSelectedTab, tabOwnsAssignee],
  );

  /*
   * The Assignee filter. It writes `filters.assigneeId`, and what it shows is
   * DERIVED from it (railAssigneeId), so the control and the list cannot
   * disagree.
   */
  const handleAssigneeSelect = useCallback(
    (assigneeId?: string) => {
      /*
       * Your own name is treated exactly like anyone else's: the rail is a
       * filter, not navigation. Picking yourself narrows the tab you are on,
       * the same as picking Zeljko, which keeps combinations like "mine, and
       * overdue" reachable in one click.
       *
       * The two person-defined tabs dim while any name is selected, including
       * your own: "Unassigned" contradicts having an assignee, and "Assigned to
       * you" is an assignee filter that would overwrite the choice. Clearing the
       * rail brings both back.
       */
      const contradictsTab =
        selectedTab === 'assigned-to-you'
          ? true
          : selectedTab === 'unassigned'
            ? Boolean(assigneeId)
            : false;

      if (contradictsTab) {
        // The tab's own meaning no longer holds, so land on All rather than
        // leave a header describing a filter it is not applying.
        setSelectedTab('all');
        setFilters(prev =>
          filtersForTab(
            'all',
            { ...prev, assigneeId: assigneeId ? [assigneeId] : undefined },
            currentUserId,
          ),
        );
        return;
      }

      setFilters(prev => ({
        ...prev,
        assigneeId: assigneeId ? [assigneeId] : undefined,
        // Picking a person contradicts "unassigned only", so it clears it
        // rather than sending both and getting nothing back.
        unassignedOnly: assigneeId ? undefined : prev.unassignedOnly,
      }));
    },
    [setFilters, selectedTab, setSelectedTab, currentUserId],
  );

  return (
    <div
      ref={gridRootRef}
      style={{ height: gridHeight }}
      // No `flex-1` here on purpose: `flex: 1 1 0%` makes the flex algorithm
      // resolve this item's main size and overrides the measured `height`
      // above, so the row grew right back to its content. `shrink-0` keeps the
      // measured height authoritative.
      className="flex min-h-0 shrink-0 gap-0 overflow-hidden"
    >
      {/* Main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-4 py-4 md:px-6 md:py-6">
        <div className="shrink-0">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Tickets</h1>
            <PermissionGuard
              requiredPermissions={[HelpdeskPermissions.TicketWrite]}
              fallback={null}
            >
              <BaseButton
                onPress={() => setIsNewRequestOpen(true)}
                icon={<Icon name="plus" className="h-4 w-4" />}
              >
                New Ticket
              </BaseButton>
            </PermissionGuard>
          </div>

          {/* Tab Bar */}
          <div className="mb-4">
            <BaseTabs
              selectedKey={selectedTab}
              onSelectionChange={handleTabChange}
              classNames={{ tabList: 'mb-5', panel: 'empty:hidden' }}
            >
              <BaseTab
                key="unanswered"
                title={tabTitle('Unanswered', 'unanswered')}
              />
              <BaseTab
                key="unclosed"
                title={tabTitle('Unclosed', 'unclosed')}
              />
              <BaseTab
                key="unassigned"
                title={tabTitle('Unassigned', 'unassigned')}
                isDisabled={isTabDisabled('unassigned')}
              />
              <BaseTab key="overdue" title={tabTitle('Overdue', 'overdue')} />
              <BaseTab
                key="assigned-to-you"
                title={tabTitle('Assigned to you', 'assigned-to-you')}
                isDisabled={isTabDisabled('assigned-to-you')}
              />
              <BaseTab key="all" title={tabTitle('All', 'all')} />
            </BaseTabs>
            {/* Filters */}
            <TicketFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onSearch={handleSearch}
              searchTerm={searchTerm}
              assigneeId={railAssigneeId}
              onAssigneeChange={handleAssigneeSelect}
              onCategoryChange={handleCategorySelect}
              columnsChooser={
                <ColumnsChooser
                  layout={ticketsLayout.layout}
                  labels={ticketsLayout.labels}
                  hints={ticketsLayout.hints}
                  persisted={ticketsLayout.hasSaved}
                  onReset={() => void ticketsLayout.reset()}
                />
              }
            />
          </div>

          {/* Bulk Actions */}
          {hasSelectedRows && (
            <div className="mt-5 flex items-center gap-4 rounded-lg bg-default-50 p-4">
              <span className="text-sm font-medium">
                {selectedRows.length} ticket
                {selectedRows.length !== 1 ? 's' : ''} selected
              </span>
              <PermissionGuard
                requiredPermissions={[HelpdeskPermissions.TicketAssign]}
                fallback={null}
              >
                <BaseButton
                  variant="bordered"
                  size="sm"
                  onPress={handleBulkAssign}
                  icon={<Icon name="UserPlusIcon" className="h-4 w-4" />}
                >
                  Assign
                </BaseButton>
              </PermissionGuard>
              <PermissionGuard
                requiredPermissions={[HelpdeskPermissions.TicketWrite]}
                fallback={null}
              >
                <BaseButton
                  variant="bordered"
                  size="sm"
                  onPress={handleBulkChangeStatus}
                  icon={<Icon name="refresh" className="h-4 w-4" />}
                >
                  Change Status
                </BaseButton>
              </PermissionGuard>
              <PermissionGuard
                requiredPermissions={[HelpdeskPermissions.TicketDelete]}
                fallback={null}
              >
                <BaseButton
                  variant="bordered"
                  size="sm"
                  color="danger"
                  onPress={handleBulkDelete}
                  icon={<Icon name="trash" className="h-4 w-4" />}
                >
                  Delete
                </BaseButton>
              </PermissionGuard>
            </div>
          )}
        </div>

        {/* Table */}
        {/* min-h-0 lets BaseTable's own scroll region take the overflow. Without
            it this flex child sizes to its content and the page scrolls instead. */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/*
            pageSizeOptions + onPageSizeChange together are what render the
            "per page" dropdown (BaseTable derives showPageSizeSelector from
            both being present). It sits bottom-right, opposite the page
            numbers, matching the asset list.

            pageIndex resets to 0 on change: at 25/page you can be on page 81,
            which does not exist at 100/page, and the grid would come back empty.
          */}
          {/*
            Keyed by the visible columns in their order. BaseTable's body is a
            React.memo whose props do not include column visibility or order,
            so hiding or moving a column in the chooser updated the header and
            not the body: the rows kept their old cells and slid out from under
            their headings. A new key redraws the body whenever the set or the
            order of columns changes.
          */}
          <BaseTable
            key={table
              .getVisibleLeafColumns()
              .map(c => c.id)
              .join(',')}
            table={table}
            fullHeight
            isLoading={isLoading || isLoadingUsers || !ticketsLayout.isReady}
            showInfo={false}
            getCellClassName={getCellClassName}
            paginationTemplate={paginationTemplate}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={size =>
              setPagination({ pageIndex: 0, pageSize: size })
            }
          />
          {/*
            BaseTable draws nothing for an empty page on desktop (its
            emptyContent is for the mobile card list only), so a filter that
            matched no tickets left a lone header row over a blank area. Laid
            over the table body, below the header, so the columns stay visible.
          */}
          {!isLoading &&
            !isLoadingUsers &&
            table.getRowModel().rows.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center px-4 pt-10">
                <EmptyState
                  title="No tickets here"
                  description="Nothing matches this tab and these filters. Try another category or tab, or clear the filters."
                />
              </div>
            )}
        </div>

        {/* Bulk Action Modals */}
        <BulkAssignModal
          isOpen={isBulkAssignModalOpen || !!assignRow}
          onClose={() => {
            setIsBulkAssignModalOpen(false);
            setAssignRow(null);
          }}
          onConfirm={handleBulkAssignConfirm}
          ticketCount={assignRow ? 1 : selectedRows.length}
          scopes={assignRowScopes ?? selectedScopes}
        />
        <BulkStatusModal
          isOpen={isBulkStatusModalOpen}
          onClose={() => setIsBulkStatusModalOpen(false)}
          onConfirm={handleBulkStatusConfirm}
          ticketCount={selectedRows.length}
          allowCustomStatuses={selectedRows.every(
            r => r.original.tenantId === viewerTenantId,
          )}
        />
        <NewRequestModal
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
          onCreated={ticketId => navigate(`/tickets/${ticketId}`)}
        />
        {confirmDialog}
      </div>
    </div>
  );
};
