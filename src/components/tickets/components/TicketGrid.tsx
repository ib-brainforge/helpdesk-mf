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
  Chip,
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

      // Apply filters based on selected tab
      let newFilters = { ...filters };

      switch (tabKey) {
        case 'unanswered':
          // REVIEW: Backend doesn't have "unanswered" status - using New status as proxy
          newFilters = { ...filters, status: [TicketStatus.New] };
          break;
        case 'unclosed':
          // REVIEW: Unclosed = everything except Closed
          newFilters = {
            ...filters,
            status: [TicketStatus.New, TicketStatus.InProgress],
          };
          break;
        case 'unassigned':
          newFilters = {
            ...filters,
            assigneeId: ['unassigned'],
            status: undefined,
          };
          break;
        case 'assigned-to-you':
          newFilters = {
            ...filters,
            assigneeId: currentUserId ? [currentUserId] : undefined,
            status: undefined,
          };
          break;
        case 'all':
        default:
          newFilters = { ...filters, status: undefined, assigneeId: undefined };
          break;
      }

      setFilters(newFilters);
    },
    [filters, setFilters, currentUserId, setSelectedTab]
  );

  // Calculate badge counts for each tab
  // REVIEW: For now showing totalCount - ideally each tab should fetch its own count
  const tabCounts = useMemo(
    () => ({
      unanswered: 0, // Would need separate API call
      unclosed: 0,
      unassigned: 0,
      assignedToYou: 0,
      all: totalCount,
    }),
    [totalCount]
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
              <BaseTab
                key="unanswered"
                title={
                  <div className="flex items-center gap-2">
                    <span>Unanswered</span>
                    {tabCounts.unanswered > 0 && (
                      <Chip size="sm">{tabCounts.unanswered}</Chip>
                    )}
                  </div>
                }
              />
              <BaseTab
                key="unclosed"
                title={
                  <div className="flex items-center gap-2">
                    <span>Unclosed</span>
                    {tabCounts.unclosed > 0 && (
                      <Chip size="sm">{tabCounts.unclosed}</Chip>
                    )}
                  </div>
                }
              />
              <BaseTab
                key="unassigned"
                title={
                  <div className="flex items-center gap-2">
                    <span>Unassigned</span>
                    {tabCounts.unassigned > 0 && (
                      <Chip size="sm">{tabCounts.unassigned}</Chip>
                    )}
                  </div>
                }
              />
              <BaseTab
                key="assigned-to-you"
                title={
                  <div className="flex items-center gap-2">
                    <span>Assigned to you</span>
                    {tabCounts.assignedToYou > 0 && (
                      <Chip size="sm">{tabCounts.assignedToYou}</Chip>
                    )}
                  </div>
                }
              />
              <BaseTab
                key="all"
                title={
                  <div className="flex items-center gap-2">
                    <span>All</span>
                    <Chip size="sm">{tabCounts.all}</Chip>
                  </div>
                }
              />
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
