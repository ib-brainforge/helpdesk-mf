import { HelpdeskPermissions } from '@/constants/permissions';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { type TicketPriority, TicketStatus } from '@/types/ticket';
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
import { useTicketsData } from '../hooks/useTickets';
import {
  useBulkDeleteTickets,
  useBulkUpdateTickets,
  useUpdateTicket,
} from '../hooks/useTickets';
import { useTicketsTable } from '../hooks/useTicketsTable';
import { BulkAssignModal } from './BulkAssignModal';
import { BulkStatusModal } from './BulkStatusModal';
import { NewTicketModal } from './NewTicketModal';
import { TicketFilters } from './TicketFilters';
import { createTicketColumns } from './ticket-grid-columns';

import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { useConfirm } from '@brainforgeau/components/page';
import { useAuth } from '@brainforgeau/security';
import { TicketSidebar } from '../TicketSidebar';
import type { TicketRow } from '../types';

// URL query-param tab persistence: ?tab=<key> synced to selected tab.
// Falls back to the first tab (TICKET_DEFAULT_TAB) when the param is absent or unknown.
const TICKET_VALID_TABS = new Set([
  'unanswered',
  'unclosed',
  'unassigned',
  'overdue',
  'assigned-to-you',
  'all',
]);
const TICKET_DEFAULT_TAB = 'unanswered';

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
  } = useTicketsData();

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
  const selectedTags = useMemo(() => filters.tagIds ?? [], [filters.tagIds]);

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
   * Deliberately NOT filtered by isActive — a ticket filed under a category
   * that was later deactivated still needs its name shown.
   */
  const { categories } = useCategoriesData();
  const categoryNameById = useMemo(() => {
    const byId = new Map<string, string>();
    for (const category of categories) {
      if (category.id) byId.set(category.id, category.name);
    }
    return byId;
  }, [categories]);

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
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);

  const handleAssign = useCallback(
    (ticketId: string, assigneeId: string) => {
      updateTicketMutation.mutate({ id: ticketId, updates: { assigneeId } });
    },
    [updateTicketMutation],
  );

  const handleChangeStatus = useCallback(
    (ticketId: string, status: TicketStatus) => {
      updateTicketMutation.mutate({ id: ticketId, updates: { status } });
    },
    [updateTicketMutation],
  );

  const handleChangePriority = useCallback(
    (ticketId: string, priority: TicketPriority) => {
      updateTicketMutation.mutate({ id: ticketId, updates: { priority } });
    },
    [updateTicketMutation],
  );

  const columns = useMemo(
    () =>
      createTicketColumns({
        onAssign: handleAssign,
        onChangeStatus: handleChangeStatus,
        onChangePriority: handleChangePriority,
        timezone,
      }),
    [handleAssign, handleChangeStatus, handleChangePriority, timezone],
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
   * MINIMUM total (1208px with every column in). Wider than that, columns scale
   * up and nothing scrolls; narrower, the shortfall becomes horizontal scroll
   * no matter how the widths are shuffled — so something has to give.
   *
   * Order, and why:
   *   Requester — Assignee is what agents triage by, and Requester is on the
   *               ticket itself.
   *   ID        — Subject is already the link; a truncated GUID is rarely what
   *               anyone scans for.
   *   Updated   — the last to go and the first to come back, since Created
   *               answers "how old is this?" on its own.
   *
   * The thresholds ARE the running totals, so each one is the width at which
   * that column's own budget stops fitting:
   *   1208 everything · 1076 without Requester · 1006 also without ID ·
   *   906 also without Updated.
   *
   * Below ~906px — a 1280 screen with the left nav expanded — it still scrolls
   * sideways. Shedding a fourth column would start costing information people
   * actually use.
   */
  useLayoutEffect(() => {
    const el = tableAreaRef.current;
    if (!el) return undefined;

    const apply = () => {
      const width = el.clientWidth;
      table.setColumnVisibility({
        requester: width >= 1208,
        id: width >= 1076,
        updatedAt: width >= 1006,
      });
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [table]);

  /*
   * Trim the scroll region so it ends on a row boundary instead of slicing the
   * next row in half.
   *
   * The region's height comes from `flex-1`, so it lands wherever the layout
   * puts it, leaving a sliver of the following row visible under the last full
   * one. Row heights vary (Subject and Category wrap), so there is no row-height
   * multiple to snap to in CSS; it has to be measured.
   *
   * Three things this has to get right, each of which broke a previous attempt:
   *
   * 1. Measure from RECTS, not offsetTop. A <tr>'s offsetParent is the <table>,
   *    so offsetTop excludes the <thead> and every row reads a header-height too
   *    high — the "last row that fits" was really 38px past the edge.
   * 2. Release the previous cap BEFORE measuring. Reading a wrapper already
   *    capped by the last pass means the value can only ever shrink, so it
   *    ratcheted down a row at a time and never grew back on a taller window.
   * 3. Observe the PARENT, not the wrapper. Observing the element we resize is
   *    a feedback loop; the parent's height is fixed by the page-height chain
   *    above and is unaffected by this cap, while still changing on window and
   *    nav resize, which is exactly when a re-snap is needed.
   *
   * Applied imperatively rather than through state: the measurement has to
   * clear and re-apply the value within a single frame, which a render cycle
   * cannot do without flashing the untrimmed height.
   */
  const tableAreaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wrapper = tableAreaRef.current;
    const parent = wrapper?.parentElement;
    if (!wrapper || !parent) return undefined;

    let frame = 0;
    const snapToRow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Release any previous cap so this measures the natural height.
        wrapper.style.maxHeight = '';

        const scroller =
          wrapper.querySelector<HTMLElement>('[class*="overflow-auto"]');
        const rows = wrapper.querySelectorAll<HTMLElement>('tbody tr');
        if (!scroller || rows.length === 0) return;

        const style = getComputedStyle(scroller);
        const scrollerRect = scroller.getBoundingClientRect();
        const contentTop =
          scrollerRect.top +
          Number.parseFloat(style.borderTopWidth) +
          Number.parseFloat(style.paddingTop);

        const available = scroller.clientHeight;
        let used = 0;
        // Indexed loop: NodeList is not iterable under this tsconfig.
        for (let i = 0; i < rows.length; i++) {
          const bottom =
            rows[i].getBoundingClientRect().bottom -
            contentTop +
            scroller.scrollTop;
          // Half-pixel tolerance: rects are sub-pixel and an exact `>` drops a
          // row that does in fact fit.
          if (bottom > available + 0.5) break;
          used = bottom;
        }

        // Nothing worth trimming, or not even one row fits — leave it alone.
        const leftover = available - used;
        if (used === 0 || leftover <= 1) return;

        // Ceil so the last fitting row still fits after the cap is applied.
        wrapper.style.maxHeight = `${Math.ceil(wrapper.clientHeight - leftover)}px`;
      });
    };

    snapToRow();
    const observer = new ResizeObserver(snapToRow);
    observer.observe(parent);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // Re-snap when the rows themselves change (new page, page size, filter).
  }, [enrichedItems, pagination.pageSize]);

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
    (assigneeId: string | undefined) => {
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
    (status: TicketStatus) => {
      const ids = selectedRows
        .map(row => row.original.id)
        .filter((id): id is string => !!id);
      bulkUpdateMutation.mutate(
        { ids, updates: { status } },
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

  const handleTagSelect = useCallback(
    (tagId: string) => {
      setFilters(prev => {
        const current = prev.tagIds ?? [];
        const newTags = current.includes(tagId)
          ? current.filter(t => t !== tagId)
          : [...current, tagId];
        return { ...prev, tagIds: newTags.length > 0 ? newTags : undefined };
      });
    },
    [setFilters],
  );

  const handleTabChange = useCallback(
    (key: string | number) => {
      const tabKey = String(key);
      setSelectedTab(tabKey);

      // Build a clean base from filters that the sidebar/filter-bar owns.
      // Tab-specific fields (status, assigneeId, unassignedOnly, overdueOnly) are
      // ALWAYS reset fresh per tab so stale flags never leak across tab switches.
      // E.g. switching overdue → all must clear overdueOnly; unassigned → all must
      // clear unassignedOnly.  Spreading the previous filters without resetting
      // these fields caused every subsequent tab to inherit the previous tab's
      // backend params and return an empty result.
      const crossTabBase: typeof filters = {
        searchTerm: filters.searchTerm,
        categoryId: filters.categoryId,
        tagIds: filters.tagIds,
        priority: filters.priority,
        customStatusId: filters.customStatusId,
      };

      let newFilters: typeof filters;

      switch (tabKey) {
        case 'unanswered':
          // Backend doesn't have an "unanswered" status — New is the closest proxy.
          newFilters = { ...crossTabBase, status: [TicketStatus.New] };
          break;
        case 'unclosed':
          // Unclosed = everything that is not Closed.
          newFilters = {
            ...crossTabBase,
            status: [TicketStatus.New, TicketStatus.InProgress],
          };
          break;
        case 'unassigned':
          // Use the dedicated unassignedOnly param; passing a magic string as
          // assigneeId is not recognised by the backend endpoint.
          newFilters = {
            ...crossTabBase,
            unassignedOnly: true,
          };
          break;
        case 'overdue':
          newFilters = { ...crossTabBase, overdueOnly: true };
          break;
        case 'assigned-to-you':
          newFilters = {
            ...crossTabBase,
            assigneeId: currentUserId ? [currentUserId] : undefined,
          };
          break;
        case 'all':
        default:
          newFilters = { ...crossTabBase };
          break;
      }

      setFilters(newFilters);
    },
    [filters, setFilters, currentUserId, setSelectedTab],
  );

  const sidebarProps = {
    onCategorySelect: handleCategorySelect,
    onTagSelect: handleTagSelect,
    selectedTags,
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
                onPress={() => setIsNewTicketModalOpen(true)}
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
              <BaseTab key="unanswered" title="Unanswered" />
              <BaseTab key="unclosed" title="Unclosed" />
              <BaseTab key="unassigned" title="Unassigned" />
              <BaseTab key="overdue" title="Overdue" />
              <BaseTab key="assigned-to-you" title="Assigned to you" />
              <BaseTab key="all" title="All" />
            </BaseTabs>
            {/* Filters */}
            <TicketFilters
              filters={filters}
              onFiltersChange={setFilters}
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
            onPageSizeChange={size => setPagination({ pageIndex: 0, pageSize: size })}
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
        <NewTicketModal
          isOpen={isNewTicketModalOpen}
          onClose={() => setIsNewTicketModalOpen(false)}
          onCreated={ticketId => navigate(`/tickets/${ticketId}`)}
        />
        {confirmDialog}
      </div>
    </div>
  );
};
