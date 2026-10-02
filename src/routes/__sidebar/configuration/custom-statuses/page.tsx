import { CustomStatusEditorModal } from '@/components/custom-statuses/components/CustomStatusEditorModal';
import {
  useCustomStatuses,
  useDeleteCustomStatus,
} from '@/components/custom-statuses/hooks/useCustomStatuses';
import { HelpdeskPermissions } from '@/constants/permissions';
import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CustomTicketStatusDto } from '@/types/custom-status';
import { TicketStatus, toTicketStatus } from '@/types/custom-status';
import {
  toBulkScopeSaveResult,
  toHelpdeskScopePatch,
  toScopeMeta,
  toWireMeta,
} from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import { BaseCard } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BulkScopeEditor } from '@brainforgeau/components/bulk-scope-editor';
import { BaseButton } from '@brainforgeau/components/button';
import { ListScopeStrip } from '@brainforgeau/components/list-scope-strip';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { ScopeBadge } from '@brainforgeau/components/scope-badge';
import { useScopeList } from '@brainforgeau/components/scope-list';
import { ScopeApi } from '@brainforgeau/helpdesk-client';
import {
  PlatformPermissions,
  useAccessScope,
  usePermissions,
} from '@brainforgeau/security';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { Chip, toast } from '@heroui/react';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

const MAPS_TO_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'New',
  [TicketStatus.InProgress]: 'In Progress',
  [TicketStatus.Closed]: 'Closed',
};

const columnHelper = createColumnHelper<CustomTicketStatusDto>();

function CustomStatusesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<
    CustomTicketStatusDto | undefined
  >();

  const { customStatuses, isLoading, refetch } = useCustomStatuses();
  const deleteMutation = useDeleteCustomStatus();
  const { confirm, dialog } = useConfirm();

  // DTO tenancy/scope metadata initiative -- see useAccessScope for why this
  // isn't @brainforgeau/security's useHierarchicalContext.
  const selectedContext = useAtomValue(selectedContextAtom);
  const { accessScope, organisationCount } = useAccessScope(
    selectedContext?.tenantId,
    { identityBaseUrl: requireIdentityApiBaseUrl() },
  );
  const { hasPlatformPermission } = usePermissions();
  const canManageScope = hasPlatformPermission(
    PlatformPermissions.Scope.Manage,
  );
  const currentOrganisationId = selectedContext?.organisationId;
  const currentDivisionId = selectedContext?.divisionId;

  // `useScopeList` owns the scope filter, out-of-context counting, and the
  // "Change all N" bulk re-scope editor -- see the entityType note on
  // `patchScope` below. Its `tableProps` is forwarded to `<ListPage>` below,
  // which wires `rowMarker` through to `<BaseTable>` for the per-row scope
  // border (see the REVIEW note by the `<ListPage>` call re: the
  // `selectionColumn` half of `tableProps`). List-side re-scoping remains
  // "Change all N out-of-context records" only; per-record scope editing is
  // always available from the edit modal's own `ContextScopeStrip`.
  const scope = useScopeList({
    rows: customStatuses,
    getMeta: row => toWireMeta(row.meta),
    getRecordId: row => row.id,
    getRecordLabel: row => row.name,
    accessScope,
    selectedContext,
    canManageScope,
    canViewScope: hasPlatformPermission(PlatformPermissions.Scope.Read),
    // entityType verified against helpdesk-backend's `HelpdeskDbContext`
    // (`DbSet<CustomTicketStatus> CustomTicketStatuses`) -- the scope
    // registry resolves by exact CLR class name, case-insensitive, NOT the
    // `v1/custom-statuses` route segment.
    patchScope: async (ids, patch) => {
      const client = await createHelpdeskApiClient(ScopeApi);
      const response = await client.v1ScopeEntityTypePatch(
        'CustomTicketStatus',
        { ids, patch: toHelpdeskScopePatch(patch) },
      );
      return toBulkScopeSaveResult(response.data);
    },
    refetch: async () => {
      await refetch();
    },
    // REVIEW: TEMPORARY -- see SCOPE_TESTING_BYPASS_SINGLE_ORG's doc comment
    // in scopeTestingBypass.ts. Remove this line to revert.
    bypassSingleOrganisationSuppressionForTesting:
      SCOPE_TESTING_BYPASS_SINGLE_ORG,
    entityLabel: { one: 'status', other: 'statuses' },
  });

  const handleCreate = () => {
    setEditingStatus(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((status: CustomTicketStatusDto) => {
    setEditingStatus(status);
    setIsModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: 'Delete Custom Status',
        body: `Are you sure you want to delete "${name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteMutation.mutateAsync(id);
        toast('Deleted', {
          description: 'Custom status deleted',
          variant: 'success',
        });
      } catch {
        toast('Error', {
          description: 'Failed to delete custom status',
          variant: 'danger',
        });
      }
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo(
    (): ColumnDef<CustomTicketStatusDto, any>[] => [
      columnHelper.display({
        id: 'scope',
        header: 'Scope',
        cell: ({ row }) => (
          <ScopeBadge
            meta={toScopeMeta(toWireMeta(row.original.meta))}
            currentOrganisationId={currentOrganisationId}
            currentDivisionId={currentDivisionId}
            organisationCount={organisationCount}
            bypassSingleOrganisationSuppressionForTesting={
              SCOPE_TESTING_BYPASS_SINGLE_ORG
            }
            size="sm"
          />
        ),
        size: 140,
      }),
      columnHelper.display({
        id: 'color',
        header: '',
        cell: ({ row }) => (
          <div
            className="border-light h-4 w-4 rounded-full border"
            style={{ backgroundColor: row.original.color ?? '#1868db' }}
          />
        ),
        size: 32,
      }),
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{row.original.name}</span>
            {row.original.isDefault && (
              <Chip size="sm" color="accent">
                Default
              </Chip>
            )}
            {row.original.isClosed && (
              <Chip size="sm" color="success">
                Counts as Closed
              </Chip>
            )}
            {!row.original.isActive && (
              <Chip size="sm" color="default">
                Inactive
              </Chip>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'mapsTo',
        header: 'Maps To',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">
            {/* Coerced: the API sends the enum NAME, MAPS_TO_LABELS is keyed
                by the numeric enum, so the raw value missed every key and this
                column read "Unknown" for every row. */}
            {MAPS_TO_LABELS[toTicketStatus(row.original.mapsToStatus)] ??
              'Unknown'}
          </span>
        ),
        size: 130,
      }),
      columnHelper.display({
        id: 'sortOrder',
        header: 'Sort Order',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">
            {row.original.sortOrder}
          </span>
        ),
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="-my-1.5 flex items-center justify-end gap-1">
            <BaseButton
              variant="link"
              size="none"
              className="text-dark dark:text-light hover:text-blue"
              aria-label="Edit status"
              onPress={() => handleEdit(row.original)}
              icon={<Icon name="pencil" className="h-4 w-4" />}
            />
            <BaseButton
              variant="link"
              size="none"
              className="text-danger hover:text-danger-600"
              aria-label="Delete status"
              onPress={() =>
                handleDeleteRequest(row.original.id, row.original.name)
              }
              icon={<Icon name="trash" className="h-4 w-4" />}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 80,
      }),
    ],
    [
      handleEdit,
      handleDeleteRequest,
      currentOrganisationId,
      currentDivisionId,
      organisationCount,
    ],
  );

  const table = useReactTable({
    data: scope.filteredRows,
    columns,
    // Keys row selection by the record's own id, matching `useScopeList`'s
    // `getRecordId` above -- required so `scope.rowSelection` (keyed by id)
    // and the table's own selection checkboxes agree on the same keys.
    getRowId: row => row.id,
    state: { rowSelection: scope.rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: scope.onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  return (
    <ListPage
      title="Custom Statuses"
      breadcrumbsKey="configuration.custom-statuses.list"
      table={table}
      isLoading={isLoading}
      // `selectionColumn`'s checkboxes are now wired to `scope.rowSelection`/
      // `onRowSelectionChange` (see `useReactTable()` above) -- selecting
      // rows here feeds `editorProps.selectedRecords`, so "Change scope"
      // (rendered inside `ListScopeStrip`'s `subheader` below) bulk-edits the
      // selection, same as `rowMarker`'s per-row scope border.
      tableProps={scope.tableProps}
      actions={
        <BaseButton
          color="primary"
          onPress={handleCreate}
          icon={<Icon name="plus" className="h-4 w-4" />}
        >
          Add Status
        </BaseButton>
      }
      subheader={
        <>
          <BaseCard className="max-w-3xl">
            <p className="text-default-700 text-sm">
              Custom statuses appear in the ticket status selector alongside the
              built-in statuses (New, In Progress, Closed). Each custom status
              maps to a built-in lifecycle state for SLA and reporting
              calculations.
            </p>
          </BaseCard>
          {/* Out-of-context banner + bulk re-scoping (DTO tenancy/scope
              metadata initiative) -- entirely driven by `useScopeList`
              (`scope.bannerProps`/`scope.editorProps`/`scope.isExpanded`). */}
          <div className="mt-3">
            <ListScopeStrip {...scope.bannerProps}>
              {scope.isExpanded && <BulkScopeEditor {...scope.editorProps} />}
            </ListScopeStrip>
          </div>
        </>
      }
      empty={
        <EmptyState
          title="No custom statuses yet"
          description="Add your first custom status to extend the built-in ticket lifecycle."
          action={
            <BaseButton color="primary" size="sm" onPress={handleCreate}>
              Create First Status
            </BaseButton>
          }
          live
        />
      }
      modals={
        <>
          <CustomStatusEditorModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingStatus(undefined);
            }}
            status={editingStatus}
          />
          {dialog}
        </>
      }
    />
  );
}

export default withAuthorizationRequired(CustomStatusesPage, {
  requiredPermissions: [HelpdeskPermissions.Settings.Manage],
});
