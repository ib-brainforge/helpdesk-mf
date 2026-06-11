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
import { type FC, useCallback, useMemo, useState } from 'react';
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const mobileSidebarState = useOverlayState();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = (() => {
    const param = searchParams.get('tab');
    return param && TICKET_VALID_TABS.has(param) ? param : TICKET_DEFAULT_TAB;
  })();
  const setSelectedTab = useCallback(
    (key: string) => {
      setSearchParams(
        (prev) => {
          prev.set('tab', key);
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
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

  // REVIEW: Real-time updates via SignalR - auto-refreshes grid when tickets change
  useRealtimeTickets();

  // Enrich tickets with user data (avatars, names, emails)
  const assigneeIds = items.map((t) => t.assigneeId).filter(Boolean);
  const requesterIds = items.map((t) => t.requesterId).filter(Boolean);
  const allUserIds = [...assigneeIds, ...requesterIds];
  const { userMap, isLoading: isLoadingUsers } = useUserEnrichment(allUserIds);

  const enrichedItems: TicketRow[] = useMemo(
    () =>
      items.map((ticket) => ({
        ...ticket,
        assigneeUserInfo: ticket.assigneeId ? userMap[ticket.assigneeId] : null,
        requesterUserInfo: ticket.requesterId
          ? userMap[ticket.requesterId]
          : null,
      })),
    [items, userMap]
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
    [updateTicketMutation]
  );

  const handleChangeStatus = useCallback(
    (ticketId: string, status: TicketStatus) => {
      updateTicketMutation.mutate({ id: ticketId, updates: { status } });
    },
    [updateTicketMutation]
  );

  const handleChangePriority = useCallback(
    (ticketId: string, priority: TicketPriority) => {
      updateTicketMutation.mutate({ id: ticketId, updates: { priority } });
    },
    [updateTicketMutation]
  );

  const columns = useMemo(
    () =>
      createTicketColumns({
        onAssign: handleAssign,
        onChangeStatus: handleChangeStatus,
        onChangePriority: handleChangePriority,
        timezone,
      }),
    [handleAssign, handleChangeStatus, handleChangePriority, timezone]
  );

  const { table } = useTicketsTable({
    data: enrichedItems,
    columns,
    totalCount,
    pagination,
    searchTerm,
    onPaginationChange: setPagination,
  });

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
        .map((row) => row.original.id)
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
        }
      );
    },
    [selectedRows, bulkUpdateMutation, table]
  );

  const handleBulkStatusConfirm = useCallback(
    (status: TicketStatus) => {
      const ids = selectedRows
        .map((row) => row.original.id)
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
        }
      );
    },
    [selectedRows, bulkUpdateMutation, table]
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = selectedRows
      .map((row) => row.original.id)
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

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setFilters({ ...filters, searchTerm: term });
    },
    [filters, setFilters]
  );

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      setFilters({
        ...filters,
        categoryId: categoryId ? [categoryId] : undefined,
      });
      // Close mobile drawer after selecting a category
      mobileSidebarState.close();
    },
    [filters, setFilters, mobileSidebarState]
  );

  const handleTagSelect = useCallback(
    (tagId: string) => {
      setSelectedTags((prev) => {
        const newTags = prev.includes(tagId)
          ? prev.filter((t) => t !== tagId)
          : [...prev, tagId];

        // Update filters with tag IDs
        setFilters({
          ...filters,
          tagIds: newTags.length > 0 ? newTags : undefined,
        });

        return newTags;
      });
    },
    [filters, setFilters]
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
    [filters, setFilters, currentUserId, setSelectedTab]
  );

  const sidebarProps = {
    onCategorySelect: handleCategorySelect,
    onTagSelect: handleTagSelect,
    selectedTags,
  };

  return (
    <div className="flex h-full gap-0">
      {/* Desktop sidebar — always visible, hidden on mobile */}
      <aside className="border-light bg-default-50 hidden h-full w-64 flex-shrink-0 flex-col border-r md:flex">
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
      <div className="flex flex-1 flex-col overflow-auto px-4 pt-4 md:px-6 md:pt-6">
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
            <div className="mt-5 flex items-center gap-4 rounded-lg bg-gray-50 p-4">
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
        <div className="flex flex-1 flex-col">
          <BaseTable
            table={table}
            fullHeight
            isLoading={isLoading || isLoadingUsers}
            showInfo={false}
            paginationTemplate={paginationTemplate}
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
          onCreated={(ticketId) => navigate(`/tickets/${ticketId}`)}
        />
        {confirmDialog}
      </div>
    </div>
  );
};
