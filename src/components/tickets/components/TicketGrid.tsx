import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { HelpdeskPermissions } from '@/constants/permissions';
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
import { PermissionGuard, useTimezone } from '@brainforgeau/security';
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerContent,
  DrawerDialog,
  DrawerRoot,
  toast,
  useOverlayState,
} from '@heroui/react';
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
} from '../hooks/ticketTabs';
import { useTicketTabCounts } from '../hooks/useTicketTabCounts';
import { useTicketsData } from '../hooks/useTickets';
import {
  useBulkDeleteTickets,
  useBulkUpdateTickets,
  useUpdateTicket,
} from '../hooks/useTickets';
import { useTicketsTable } from '../hooks/useTicketsTable';
import { NewRequestModal } from '../new-request/NewRequestModal';
import { BulkAssignModal } from './BulkAssignModal';
import { BulkStatusModal } from './BulkStatusModal';
import { TicketFilters } from './TicketFilters';
import { createTicketColumns } from './ticket-grid-columns';

import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { usePresetCategories } from '@/components/categories/hooks/usePresetCategories';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { useConfirm } from '@brainforgeau/components/page';
import { useAuth } from '@brainforgeau/security';
import { TicketSidebar } from '../TicketSidebar';
import type { TicketRow } from '../types';

export const TicketGrid: FC = () => {
  const navigate = useNavigate();
  const timezone = useTimezone();
  const { user } = useAuth();
  const currentUserId = user?.profile?.sub;
  const [searchTerm, setSearchTerm] = useState('');
  const mobileSidebarState = useOverlayState();

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
  );

  /*
   * The sidebar's highlight is DERIVED from `filters`, not stored alongside it.
   *
   * These used to be their own useState, which meant "Clear Filters" could wipe
   * `filters` while the sidebar went on highlighting a category and the tag
   * chips stayed lit — two sources of truth for one piece of state. Deriving
   * them makes that desync unrepresentable: clearing the filters returns the
   * sidebar to "All categories" on its own, with nothing left to keep in sync.
   */
  const selectedCategoryId = filters.categoryId?.[0] ?? null;

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
   * No extra request: TicketSidebar on this page already fetches this hook's
   * ['helpdesk-categories'] query, so this reads the same React Query cache.
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

  const updateTicketMutation = useUpdateTicket();
  const bulkUpdateMutation = useBulkUpdateTickets();
  const bulkDeleteMutation = useBulkDeleteTickets();

  const { confirm, dialog: confirmDialog } = useConfirm();
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);

  const handleAssign = useCallback(
    (ticketId: string, assigneeId: string | null) => {
      updateTicketMutation.mutate({ id: ticketId, updates: { assigneeId } });
    },
    [updateTicketMutation],
  );

  const handleChangeStatus = useCallback(
    (ticketId: string, status: TicketStatus, customStatusId: string | null) => {
      updateTicketMutation.mutate({
        id: ticketId,
        updates: { status, customStatusId },
      });
    },
    [updateTicketMutation],
  );

  const handleChangePriority = useCallback(
    (ticketId: string, priority: TicketPriority) => {
      updateTicketMutation.mutate({ id: ticketId, updates: { priority } });
    },
    [updateTicketMutation],
  );

  // Tenant-defined statuses, offered by the row menu alongside the built-in
  // three and applied through the same status patch.
  const { customStatuses } = useCustomStatuses();

  // Tenant and organisation names for the Scope column; tickets carry ids only.
  const scopeNames = useScopeNames();

  const columns = useMemo(
    () =>
      createTicketColumns({
        onAssign: handleAssign,
        onChangeStatus: handleChangeStatus,
        onChangePriority: handleChangePriority,
        currentUserId,
        timezone,
        scopeNames,
        customStatuses,
      }),
    [
      handleAssign,
      handleChangeStatus,
      handleChangePriority,
      currentUserId,
      timezone,
      scopeNames,
      customStatuses,
    ],
  );

  const { table } = useTicketsTable({
    data: enrichedItems,
    columns,
    totalCount,
    pagination,
    searchTerm,
    onPaginationChange: setPagination,
  });

  /*
   * Shed columns, least load-bearing first, when the grid is too narrow to hold
   * them all.
   *
   * The grid is `table-layout: fixed` and the column `size` values behave as a
   * MINIMUM total (1368px with every column in). Wider than that, columns scale
   * up and nothing scrolls; narrower, the shortfall becomes horizontal scroll
   * no matter how the widths are shuffled — so something has to give.
   *
   * Order, and why:
   *   ID        — goes first. It is eight characters of a GUID; Subject is
   *               already the link to the ticket, so nobody scans for it.
   *   Requester — next. Who asked is worth more than the id, which is why it
   *               outranks it here, but Assignee is what agents triage by.
   *   Updated   then Updated, since Created answers "how old is this?" on
   *               its own.
   *   Scope     last to go and first to come back. It was asked for, and on
   *               a grid where every other column describes the ticket it is
   *               the only one saying which organisation owns it.
   *
   * The thresholds ARE the running totals, so each one is the width at which
   * that column's own budget stops fitting:
   *   1368 everything · 1298 without ID · 1146 also without Requester ·
   *   1046 also without Updated · 886 also without Scope.
   *
   * Below ~906px — a 1280 screen with the left nav expanded — it still scrolls
   * sideways. Shedding a fifth column would start costing information people
   * actually use.
   */
  useLayoutEffect(() => {
    const el = tableAreaRef.current;
    if (!el) return undefined;

    const apply = () => {
      const width = el.clientWidth;
      table.setColumnVisibility({
        id: width >= 1368,
        requester: width >= 1298,
        updatedAt: width >= 1146,
        scope: width >= 1046,
      });
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [table]);
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
  const tableAreaRef = useRef<HTMLDivElement>(null);

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
            <span className="bg-lighter-blue text-blue rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums">
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

  const handleBulkAssign = useCallback(() => {
    setIsBulkAssignModalOpen(true);
  }, []);

  const handleBulkChangeStatus = useCallback(() => {
    setIsBulkStatusModalOpen(true);
  }, []);

  const handleBulkAssignConfirm = useCallback(
    (assigneeId: string | null) => {
      const ids = selectedRows
        .map(row => row.original.id)
        .filter((id): id is string => !!id);
      bulkUpdateMutation.mutate(
        { ids, updates: { assigneeId } },
        {
          onSuccess: () => {
            toast('Tickets assigned', {
              description: `Successfully assigned ${ids.length} ticket${ids.length !== 1 ? 's' : ''}`,
              variant: 'success',
            });
            table.resetRowSelection();
          },
        },
      );
    },
    [selectedRows, bulkUpdateMutation, table],
  );

  const handleBulkStatusConfirm = useCallback(
    (status: TicketStatus, customStatusId: string | null) => {
      const ids = selectedRows
        .map(row => row.original.id)
        .filter((id): id is string => !!id);
      bulkUpdateMutation.mutate(
        { ids, updates: { status, customStatusId } },
        {
          onSuccess: () => {
            toast('Status updated', {
              description: `Successfully updated ${ids.length} ticket${ids.length !== 1 ? 's' : ''}`,
              variant: 'success',
            });
            table.resetRowSelection();
          },
        },
      );
    },
    [selectedRows, bulkUpdateMutation, table],
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = selectedRows
      .map(row => row.original.id)
      .filter((id): id is string => !!id);
    const ok = await confirm({
      title: 'Delete Tickets',
      body: `This action will permanently delete ${ids.length} ticket${ids.length !== 1 ? 's' : ''}. Are you sure you want to continue?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        toast('Tickets deleted', {
          description: `Successfully deleted ${ids.length} ticket${ids.length !== 1 ? 's' : ''}`,
          variant: 'success',
        });
        table.resetRowSelection();
      },
    });
  }, [selectedRows, confirm, bulkDeleteMutation, table]);

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
      setFilters(
        isClear ? filtersForTab(selectedTab, {}, currentUserId) : next,
      );
    },
    [setFilters, selectedTab, currentUserId],
  );

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      setFilters(prev => ({
        ...prev,
        categoryId: categoryId ? [categoryId] : undefined,
      }));
      // Close mobile drawer after selecting a category
      mobileSidebarState.close();
    },
    [setFilters, mobileSidebarState],
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
   * Assignee is one filter with two ways in: this rail for the busiest few,
   * and the toolbar autocomplete for anyone else, including people with
   * nothing open. Both write `filters.assigneeId` and the rail's highlight is
   * DERIVED from it, so they cannot disagree the way the old category pair
   * could.
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

  const sidebarProps = {
    onCategorySelect: handleCategorySelect,
    /*
     * The rail highlights what YOU chose, so it reads railAssigneeId rather
     * than the raw filter.
     *
     * On "Assigned to you" the tab sets the assignee itself, which lit your row
     * even though you had not touched the rail. Rows toggle, so clicking your
     * own name there deselected instead of selecting and dumped you back to an
     * unfiltered All. Now that tab leaves the rail on "All assignees", and
     * clicking any name, including your own, selects it and behaves identically.
     */
    selectedAssigneeId: railAssigneeId,
    onAssigneeSelect: handleAssigneeSelect,
    // So each person's count in the rail is the same figure the All tab shows
    // once that person is selected.
    ticketFilters: filters,
    // Lets the sidebar highlight the active category and show "All categories"
    // as selected when no filter is applied.
    selectedCategoryId,
  };

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
      {/* Desktop sidebar — always visible, hidden on mobile */}
      {/*
        No height of its own — it stretches to the row, which is now sized by the
        flex chain above. An earlier attempt used `h-screen self-start`, but the
        row starts BELOW the top navbar, so a 100vh sidebar hung roughly a
        navbar-height past the bottom of the viewport: that alone made the page
        scrollable and stretched the ticket column, which then rendered one extra
        row.

        `min-h-0` + `overflow-hidden` keep the category list from pushing the row
        taller; the scroll region inside TicketSidebar absorbs it instead.
      */}
      <aside className="border-light bg-default-50 hidden min-h-0 w-64 flex-shrink-0 flex-col overflow-hidden border-r md:flex">
        <TicketSidebar {...sidebarProps} />
      </aside>

      {/* Mobile sidebar — rendered as a Drawer overlay (HeroUI 3 compound pattern) */}
      <DrawerRoot state={mobileSidebarState}>
        <DrawerBackdrop isDismissable className="md:hidden">
          <DrawerContent placement="left" className="max-w-72">
            <DrawerDialog>
              <DrawerBody>
                <TicketSidebar
                  {...sidebarProps}
                  onClose={() => mobileSidebarState.close()}
                />
              </DrawerBody>
            </DrawerDialog>
          </DrawerContent>
        </DrawerBackdrop>
      </DrawerRoot>

      {/* Main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-4 py-4 md:px-6 md:py-6">
        <div className="shrink-0">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Hamburger button — mobile only */}
              <button
                type="button"
                className="hover:bg-default-100 flex items-center justify-center rounded-md p-1.5 transition-colors md:hidden"
                aria-label="Open filter sidebar"
                onClick={() => mobileSidebarState.open()}
              >
                <Icon name="Bars3Icon" className="text-default-600 h-5 w-5" />
              </button>
              <h1 className="text-2xl font-semibold">Tickets</h1>
            </div>
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
        <div ref={tableAreaRef} className="flex min-h-0 flex-1 flex-col">
          {/*
            pageSizeOptions + onPageSizeChange together are what render the
            "per page" dropdown (BaseTable derives showPageSizeSelector from
            both being present). It sits bottom-right, opposite the page
            numbers, matching the asset list.

            pageIndex resets to 0 on change: at 25/page you can be on page 81,
            which does not exist at 100/page, and the grid would come back empty.
          */}
          <BaseTable
            table={table}
            fullHeight
            isLoading={isLoading || isLoadingUsers}
            showInfo={false}
            paginationTemplate={paginationTemplate}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={size =>
              setPagination({ pageIndex: 0, pageSize: size })
            }
          />
        </div>

        {/* Bulk Action Modals */}
        <BulkAssignModal
          isOpen={isBulkAssignModalOpen}
          onClose={() => setIsBulkAssignModalOpen(false)}
          onConfirm={handleBulkAssignConfirm}
          ticketCount={selectedRows.length}
        />
        <BulkStatusModal
          isOpen={isBulkStatusModalOpen}
          onClose={() => setIsBulkStatusModalOpen(false)}
          onConfirm={handleBulkStatusConfirm}
          ticketCount={selectedRows.length}
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
