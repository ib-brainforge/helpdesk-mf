import type {
  BulkTicketAction,
  BulkTicketPriority,
  BulkTicketResultDto,
} from '@/api/local/ticket-bulk';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useDebounced } from '@/hooks/useDebounced';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { useScopeNames } from '@/hooks/useScopeNames';
import { loadUsers } from '@/hooks/useUserEnrichment';
import { contextQueryKeyAtom } from '@/state/context-query-key';
import type { TicketPriority, TicketStatus } from '@/types/ticket';
import { toSortParam, withSortKeys } from '@/utils/listSort';
import { BaseButton, Icon } from '@brainforgeau/components';
import {
  ListPage,
  useConfirm,
  useListPage,
} from '@brainforgeau/components/page';
import {
  PermissionGuard,
  useAuth,
  usePermissions,
  useTimezone,
} from '@brainforgeau/security';
import { useNavigate, useSearchParams } from '@modern-js/runtime/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { isHandledAbove, selectableRows, ticketPath } from '../handled-above';
import {
  TENANT_TAB_KEYS,
  TICKET_FILTER_CODECS,
  TICKET_TAB_KEYS,
  type TicketTabKey,
  defaultSortForTab,
  tabFilterPatch,
  tabForFilters,
  toTicketFilters,
} from '../hooks/ticketTabs';
import { useBulkTicketAction } from '../hooks/useBulkTicketAction';
import {
  searchMatchesQuery,
  useSearchMatches,
} from '../hooks/useSearchMatches';
import { useTicketTabCounts } from '../hooks/useTicketTabCounts';
import {
  fetchOwnTicketCount,
  fetchTicketIds,
  fetchTicketList,
  withSearchMatches,
} from '../hooks/useTickets';
import { NewRequestModal } from '../new-request/NewRequestModal';
import type { TicketRow } from '../types';
import { BulkAssignModal } from './BulkAssignModal';
import { BulkStatusModal } from './BulkStatusModal';
import { TicketListFilters } from './TicketListFilters';
import { TicketTabsRow } from './TicketTabsRow';
import { COUNT_BADGE_CLASS } from './ticket-filter-controls';
import {
  SORT_KEYS,
  TICKET_DEFAULT_HIDDEN,
  createTicketColumns,
} from './ticket-grid-columns';
import { type SelectedTicket, toSelectedTicket } from './ticketSelection';

interface TicketListProps {
  /**
   * The provider's "From tenants" queue (tickets raised by or forwarded
   * from a customer tenant) instead of the tenant's own tickets.
   */
  fromTenants?: boolean;
}

const INITIAL_VISIBILITY = Object.fromEntries(
  TICKET_DEFAULT_HIDDEN.map(id => [id, false]),
);

const TICKET_NOUN = { one: 'ticket', other: 'tickets' } as const;

export const TicketList: FC<TicketListProps> = ({ fromTenants = false }) => {
  const navigate = useNavigate();
  const timezone = useTimezone();
  const queryClient = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const { user } = useAuth();
  const currentUserId = user?.profile?.sub;
  const scopeNames = useScopeNames();
  const { categories: ownedCategories } = useCategoriesData();
  // Tenant-defined statuses, offered by the row menu alongside the built-in
  // three and applied through the same status patch.
  const { customStatuses } = useCustomStatuses();

  // REVIEW: Real-time updates via SignalR - refreshes the list when tickets change
  useRealtimeTickets();

  const [searchParams, setSearchParams] = useSearchParams();
  // ?new=1 (where the old /tickets/new now lands) opens the wizard.
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(
    () => searchParams.get('new') === '1',
  );
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setSearchParams(
      prev => {
        prev.delete('new');
        return prev;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  /*
   * Every write from the list, bulk bar and row actions alike, goes through
   * one request scoped the way the list is read. The per-ticket calls used the
   * app's own company token, so on the all-companies list another company's
   * tickets came back "not found" and nothing was shown.
   */
  const ticketAction = useBulkTicketAction();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  // The row menu's Assign opens the same picker as bulk assign, for one row.
  const [assignRow, setAssignRow] = useState<TicketRow | null>(null);

  const refOf = useCallback((id: string) => ({ id }), []);

  const handleAssign = useCallback(
    (
      ticketId: string,
      assigneeId: string | null,
      assigneeName?: string | null,
    ) => {
      ticketAction.mutate({
        tickets: [refOf(ticketId)],
        action: 'Assign',
        assigneeId,
        assigneeName,
      });
    },
    [ticketAction.mutate, refOf],
  );

  const handleChangeStatus = useCallback(
    (ticketId: string, status: TicketStatus, customStatusId: string | null) => {
      ticketAction.mutate({
        tickets: [refOf(ticketId)],
        action: 'SetStatus',
        status,
        customStatusId,
      });
    },
    [ticketAction.mutate, refOf],
  );

  const handleChangePriority = useCallback(
    (ticketId: string, priority: TicketPriority) => {
      ticketAction.mutate({
        tickets: [refOf(ticketId)],
        action: 'SetPriority',
        // The row menu offers Critical and High only, never None.
        priority: priority as BulkTicketPriority,
      });
    },
    [ticketAction.mutate, refOf],
  );

  // Quick assign on an unassigned row, and assign in the row menu, are both
  // driven by onAssign. Withholding it from people without the assign
  // permission removes both, rather than showing controls the API refuses.
  const { hasPermission } = usePermissions();
  const canAssign = hasPermission(HelpdeskPermissions.TicketAssign);
  const canWrite = hasPermission(HelpdeskPermissions.TicketWrite);

  const columns = useMemo(() => {
    const categoryNameById = new Map<string, string>();
    for (const category of ownedCategories) {
      if (category.id) categoryNameById.set(category.id, category.name);
    }
    return withSortKeys(
      createTicketColumns({
        onAssign: canAssign ? handleAssign : undefined,
        canWrite,
        onOpenAssign: canAssign ? setAssignRow : undefined,
        onChangeStatus: handleChangeStatus,
        onChangePriority: handleChangePriority,
        currentUserId,
        timezone,
        scopeNames,
        customStatuses,
        fromTenants,
        ticketBasePath: fromTenants ? '/provider/tickets' : '/tickets',
        categoryNameById,
      }),
      SORT_KEYS,
    );
  }, [
    canAssign,
    canWrite,
    handleAssign,
    handleChangeStatus,
    handleChangePriority,
    currentUserId,
    timezone,
    scopeNames,
    customStatuses,
    fromTenants,
    ownedCategories,
  ]);

  /*
   * The name matches the search box adds (people and places whose NAME fits
   * the text, as ids), cached so the list and the "all matching" calls below
   * ask the same question.
   */
  const scopeOptions = useMemo(
    () => [
      ...scopeNames.tenantOptions,
      ...scopeNames.organisationOptions,
      ...scopeNames.divisionOptions,
    ],
    [
      scopeNames.tenantOptions,
      scopeNames.organisationOptions,
      scopeNames.divisionOptions,
    ],
  );
  const list = useListPage<TicketRow, typeof TICKET_FILTER_CODECS>({
    listId: fromTenants ? 'helpdesk.provider-tickets' : 'helpdesk.tickets',
    queryKey: [
      'tickets',
      'list',
      fromTenants ? 'from-tenants' : 'own',
      contextKey,
    ],
    columns,
    search: {},
    filters: TICKET_FILTER_CODECS,
    // The list endpoints always return an id.
    getRowId: row => row.id as string,
    enableRowSelection: true,
    initialColumnVisibility: INITIAL_VISIBILITY,
    queryFn: async ({ pageIndex, pageSize, sorting, search, listFilters }) => {
      const matches = await queryClient.fetchQuery(
        searchMatchesQuery({
          searchTerm: search,
          queryClient,
          contextKey,
          scopeOptions,
        }),
      );
      const filters = withSearchMatches(
        toTicketFilters(listFilters, search, currentUserId),
        matches.userIds,
        matches.scopeIds,
      );
      const { rows, totalCount } = await fetchTicketList({
        filters,
        page: pageIndex + 1,
        pageSize,
        sort: toSortParam(sorting, SORT_KEYS),
        fromTenants,
      });
      // People are named here rather than in a hook, so each row arrives whole.
      const userMap = await loadUsers(
        contextKey,
        rows.flatMap(t => [t.assigneeId, t.requesterId]),
      );
      return {
        rows: rows.map(
          (ticket): TicketRow => ({
            ...ticket,
            assigneeUserInfo: ticket.assigneeId
              ? userMap[ticket.assigneeId]
              : null,
            requesterUserInfo: ticket.requesterId
              ? userMap[ticket.requesterId]
              : null,
          }),
        ),
        totalCount,
      };
    },
    // Held until the names the search and the "me" filter need are known.
    queryOptions: { enabled: !scopeNames.isLoading && Boolean(currentUserId) },
  });

  const filterValues = list.filters;
  const activeTab = tabForFilters(filterValues, currentUserId);

  /*
   * The filters as the endpoints take them, for the tab badges and the "all
   * matching" calls. The search text settles first, as it does for the list.
   */
  const settledSearch = useDebounced(list.search, 300);
  const baseFilters = useMemo(
    () => toTicketFilters(filterValues, settledSearch, currentUserId),
    [filterValues, settledSearch, currentUserId],
  );
  const matches = useSearchMatches(settledSearch);
  const queryFilters = useMemo(
    () => withSearchMatches(baseFilters, matches.userIds, matches.scopeIds),
    [baseFilters, matches.userIds, matches.scopeIds],
  );

  /*
   * The badges are scoped by whatever you filtered, the assignee included, so
   * each one counts the list you would get by clicking it: with you in Assignee,
   * Overdue reads your overdue tickets. The hook strips the tab-owned status
   * fields itself, so passing the live filters does not make the counts
   * refetch on every tab change.
   */
  const { counts, assigneeCounts } = useTicketTabCounts(
    baseFilters,
    currentUserId,
    { fromTenants },
  );

  /*
   * Tab label with its count beside it. The badge is omitted until the counts
   * arrive, rather than showing a 0: a queue tab that reads "0" is a statement
   * about the data, and it should never say that while it simply does not know.
   * Fixed minimum width, so the row keeps its geometry whatever the numbers do.
   */
  const tabTitle = useCallback(
    (label: string, key: TicketTabKey) => {
      const count = counts?.[key];
      return (
        <span className="flex items-center gap-1 whitespace-nowrap">
          {label}
          {count !== undefined && (
            <span className={COUNT_BADGE_CLASS}>{count}</span>
          )}
        </span>
      );
    },
    [counts],
  );

  // Choosing a tab writes its status / overdue values into the filters and
  // gives the queue its usual sort; the other filters stay.
  const handleTabChange = useCallback(
    (key: string) => {
      const tab = key as TicketTabKey;
      list.setFilters(tabFilterPatch(tab));
      list.table.setSorting(defaultSortForTab(tab));
    },
    [list.setFilters, list.table],
  );

  /*
   * THE SELECTION.
   *
   * The rows ticked on this page (the table's own selection). A ticket handled
   * above the tenant lives in another tenant, so it is never selectable.
   * "All matching" selects every ticket the filters match without listing
   * them; a bulk action then asks /tickets/ids for the ids. Changing the
   * filters, the sort or the page clears the selection, and with it this.
   */
  const pageRows = useMemo(() => selectableRows(list.rows), [list.rows]);
  const selectedTickets = useMemo(
    () => selectableRows(list.selectedRows).map(toSelectedTicket),
    [list.selectedRows],
  );
  const { setRowSelection } = list.table;
  useEffect(() => {
    const blocked = list.selectedRows.filter(isHandledAbove);
    if (blocked.length === 0) return;
    setRowSelection(prev => {
      const next = { ...prev };
      for (const row of blocked) if (row.id) delete next[row.id];
      return next;
    });
  }, [list.selectedRows, setRowSelection]);

  const [allMatching, setAllMatching] = useState(false);
  const wholePageSelected =
    pageRows.length > 0 && selectedTickets.length === pageRows.length;
  useEffect(() => {
    if (allMatching && !wholePageSelected) setAllMatching(false);
  }, [allMatching, wholePageSelected]);
  const { clearSelection } = list;
  const clearAll = useCallback(() => {
    setAllMatching(false);
    clearSelection();
  }, [clearSelection]);

  /*
   * "All matching" means every OWN ticket that matches (what /tickets/ids
   * returns); the list's totalCount also counts the rows raised above the
   * tenant. Asked only once a whole page is selected, which is when the
   * offer appears.
   */
  const { data: ownMatchingCount } = useQuery({
    queryKey: ['tickets', 'own-count', queryFilters, fromTenants],
    enabled: wholePageSelected || allMatching,
    queryFn: () => fetchOwnTicketCount(queryFilters, fromTenants),
  });
  const selectedCount = allMatching
    ? (ownMatchingCount ?? pageRows.length)
    : selectedTickets.length;
  // In "all matching" mode the rows are not known until the ids are fetched,
  // so the pickers are scoped by this page's rows: a fair guide to who can be
  // assigned and which statuses apply.
  const selectedScopes = useMemo(
    () =>
      (allMatching ? pageRows.map(toSelectedTicket) : selectedTickets).map(
        r => ({
          tenantId: r.tenantId,
          organisationId: r.organisationId,
          divisionId: r.divisionId,
        }),
      ),
    [allMatching, pageRows, selectedTickets],
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

  const sortParam = toSortParam(list.table.getState().sorting, SORT_KEYS);

  /*
   * The tickets an action covers, read when it runs: the picks, or every
   * match from /tickets/ids. Over 100 asks first ("Update 2,020 tickets?"),
   * and says so when the ids came back truncated. Null when cancelled.
   */
  const resolveSelection = useCallback(
    async (verb: string): Promise<SelectedTicket[] | null> => {
      let tickets: SelectedTicket[];
      let truncatedFrom: number | null = null;
      if (allMatching) {
        const result = await fetchTicketIds(
          queryFilters,
          fromTenants,
          sortParam,
        );
        tickets = result.items;
        if (result.truncated) truncatedFrom = result.total;
      } else {
        tickets = selectedTickets;
      }
      if (tickets.length > 100 || truncatedFrom !== null) {
        const n = tickets.length.toLocaleString('en-AU');
        const ok = await confirm({
          title: `${verb} ${n} tickets?`,
          body:
            truncatedFrom !== null
              ? `${truncatedFrom.toLocaleString('en-AU')} tickets match, but only the first ${n} can be changed at once. The rest stay as they are.`
              : `This changes all ${n} selected tickets.`,
          confirmLabel: `${verb} ${n} tickets`,
        });
        if (!ok) return null;
      }
      return tickets;
    },
    [
      allMatching,
      queryFilters,
      fromTenants,
      sortParam,
      selectedTickets,
      confirm,
    ],
  );

  // After a bulk action only the tickets that failed stay selected, so the
  // user can see which they were and try again.
  const keepFailedSelected = useCallback(
    (result: BulkTicketResultDto) => {
      const failed = new Set(result.failed.map(f => f.ticketId));
      setAllMatching(false);
      setRowSelection(prev =>
        Object.fromEntries(
          Object.entries(prev).filter(([id]) => failed.has(id)),
        ),
      );
    },
    [setRowSelection],
  );

  const runBulk = useCallback(
    async (
      verb: string,
      action: BulkTicketAction & { assigneeName?: string | null },
    ) => {
      const tickets = await resolveSelection(verb);
      if (!tickets) return;
      ticketAction.mutate(
        { tickets, ...action },
        { onSuccess: keepFailedSelected },
      );
    },
    [resolveSelection, ticketAction.mutate, keepFailedSelected],
  );

  const handleBulkAssignConfirm = useCallback(
    (assigneeId: string | null, assigneeName?: string | null) => {
      // One row from its menu, or the selection from the bulk bar.
      if (assignRow?.id) {
        handleAssign(assignRow.id, assigneeId, assigneeName);
        return;
      }
      void runBulk('Assign', { action: 'Assign', assigneeId, assigneeName });
    },
    [assignRow, handleAssign, runBulk],
  );

  const handleBulkStatusConfirm = useCallback(
    (status: TicketStatus, customStatusId: string | null) => {
      void runBulk('Update', {
        action: 'SetStatus',
        status: status as 'New' | 'InProgress' | 'Closed',
        customStatusId,
      });
    },
    [runBulk],
  );

  const handleBulkDelete = useCallback(async () => {
    const n = selectedCount.toLocaleString('en-AU');
    const ok = await confirm({
      title: 'Delete Tickets',
      body: `This action will permanently delete ${n} ticket${selectedCount !== 1 ? 's' : ''}. Are you sure you want to continue?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const tickets = await resolveSelection('Delete');
    if (!tickets) return;
    ticketAction.mutate(
      { tickets, action: 'Delete' },
      { onSuccess: keepFailedSelected },
    );
  }, [
    selectedCount,
    confirm,
    resolveSelection,
    ticketAction.mutate,
    keepFailedSelected,
  ]);

  const bulkActions = (
    <>
      {/* Gmail's pattern: a whole page selected offers every match, and every
          match offers the way back. */}
      {allMatching ? (
        <span className="text-sm text-default-600">
          All {selectedCount.toLocaleString('en-AU')} matching tickets are
          selected.{' '}
          <button
            type="button"
            className="text-blue font-medium hover:underline"
            onClick={clearAll}
          >
            Clear selection
          </button>
        </span>
      ) : (
        wholePageSelected &&
        (ownMatchingCount ?? 0) > pageRows.length && (
          <span className="text-sm text-default-600">
            All {pageRows.length} on this page are selected.{' '}
            <button
              type="button"
              className="text-blue font-medium hover:underline"
              onClick={() => setAllMatching(true)}
            >
              Select all {(ownMatchingCount ?? 0).toLocaleString('en-AU')}{' '}
              matching tickets
            </button>
          </span>
        )
      )}
      <PermissionGuard
        requiredPermissions={[HelpdeskPermissions.TicketAssign]}
        fallback={null}
      >
        <BaseButton
          variant="bordered"
          color="light"
          size="sm"
          onPress={() => setIsBulkAssignModalOpen(true)}
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
          color="light"
          size="sm"
          onPress={() => setIsBulkStatusModalOpen(true)}
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
    </>
  );

  return (
    <ListPage
      title={fromTenants ? 'From tenants' : 'Tickets'}
      breadcrumbsKey={fromTenants ? 'provider.tickets' : 'tickets.list'}
      list={list}
      personalise
      countNoun={TICKET_NOUN}
      loadError={list.isError ? list.error : undefined}
      onRetry={() => void list.refetch()}
      // Raising a ticket needs tickets.create, not tickets.update: a tenant
      // can raise one but not edit it.
      actions={
        fromTenants ? undefined : (
          <PermissionGuard
            requiredPermissions={[HelpdeskPermissions.Tickets.Create]}
            fallback={null}
          >
            <BaseButton
              onPress={() => setIsNewRequestOpen(true)}
              icon={<Icon name="plus" className="h-4 w-4" />}
            >
              New Ticket
            </BaseButton>
          </PermissionGuard>
        )
      }
      subheader={
        <div className="helpdesk-soft-borders">
          <TicketTabsRow
            selectedTab={activeTab}
            onTabChange={handleTabChange}
            keys={canAssign ? TICKET_TAB_KEYS : TENANT_TAB_KEYS}
            renderTitle={tabTitle}
          />
          {filterValues.raised && (
            <p className="mb-2 text-sm text-default-600">
              Showing the tickets you raised that your provider or Netcorp
              handles.{' '}
              <button
                type="button"
                className="text-blue font-medium hover:underline"
                onClick={() => list.setFilter('raised', false)}
              >
                Show all tickets
              </button>
            </p>
          )}
        </div>
      }
      filters={
        <TicketListFilters
          values={filterValues}
          onChange={list.setFilters}
          search={list.search}
          onSearch={list.setSearch}
          currentUserId={currentUserId}
          assigneeCounts={assigneeCounts}
          isStaff={canAssign}
        />
      }
      // The "Raised with our provider" preset lists only rows handled above
      // the tenant, none of which can be acted on: no selection at all.
      bulk={
        filterValues.raised
          ? undefined
          : { entityLabel: TICKET_NOUN, actions: bulkActions }
      }
      modals={
        <>
          <BulkAssignModal
            isOpen={isBulkAssignModalOpen || !!assignRow}
            onClose={() => {
              setIsBulkAssignModalOpen(false);
              setAssignRow(null);
            }}
            onConfirm={handleBulkAssignConfirm}
            ticketCount={assignRow ? 1 : selectedCount}
            scopes={assignRowScopes ?? selectedScopes}
          />
          <BulkStatusModal
            isOpen={isBulkStatusModalOpen}
            onClose={() => setIsBulkStatusModalOpen(false)}
            onConfirm={handleBulkStatusConfirm}
            ticketCount={selectedCount}
          />
          <NewRequestModal
            isOpen={isNewRequestOpen}
            onClose={() => setIsNewRequestOpen(false)}
            onCreated={created =>
              navigate(ticketPath(created.id, created.handledAbove))
            }
          />
          {confirmDialog}
        </>
      }
    />
  );
};
