import { ScopeApi } from '@/api/helpdesk-client';
import { CustomStatusEditorModal } from '@/components/custom-statuses/components/CustomStatusEditorModal';
import {
  useCustomStatuses,
  useDeleteCustomStatus,
} from '@/components/custom-statuses/hooks/useCustomStatuses';
import {
  IconTip,
  PageHint,
  PresetPill,
  ScopeLabel,
  badgeSwatchClasses,
} from '@/components/shared';
import { getStatusConfig } from '@/components/tickets/ticket-status-config';
import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CustomTicketStatusDto } from '@/types/custom-status';
import { TicketStatus, toTicketStatus } from '@/types/custom-status';
import { TicketStatus as TicketStatusName } from '@/types/ticket';
import {
  toBulkScopeSaveResult,
  toHelpdeskScopePatch,
  toScopeMeta,
  toWireMeta,
} from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import { Icon } from '@brainforgeau/components/base';
import { BulkScopeEditor } from '@brainforgeau/components/bulk-scope-editor';
import { BaseButton } from '@brainforgeau/components/button';
import { ListScopeStrip } from '@brainforgeau/components/list-scope-strip';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { useScopeList } from '@brainforgeau/components/scope-list';
import {
  PlatformPermissions,
  useAccessScope,
  usePermissions,
} from '@brainforgeau/security';
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

/*
 * The built-in statuses every ticket starts from, listed under the tenant's
 * own so the page shows the whole set a ticket can be in. A custom status
 * maps onto one of these, so leaving them out made "Maps To" refer to things
 * the page never showed. They are marked Preset and are read only: they are
 * not records, so they cannot be edited, deleted or re-scoped.
 */
const PRESET_PREFIX = 'preset-status-';
const isPreset = (status: CustomTicketStatusDto) =>
  status.id.startsWith(PRESET_PREFIX);
const PRESET_STATUS_NAMES = [
  [TicketStatus.New, TicketStatusName.New],
  [TicketStatus.InProgress, TicketStatusName.InProgress],
  [TicketStatus.Closed, TicketStatusName.Closed],
] as const;
const PRESET_STATUSES: CustomTicketStatusDto[] = PRESET_STATUS_NAMES.map(
  ([status, name], index) => ({
    id: `${PRESET_PREFIX}${name}`,
    name: MAPS_TO_LABELS[status],
    sortOrder: index + 1,
    mapsToStatus: name as unknown as CustomTicketStatusDto['mapsToStatus'],
    isClosed: status === TicketStatus.Closed,
    isDefault: false,
    isActive: true,
    createdAt: '',
    modifiedAt: '',
  }),
);
const presetStatusName = (status: CustomTicketStatusDto) =>
  status.id.slice(PRESET_PREFIX.length) as TicketStatusName;

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
        cell: ({ row }) =>
          isPreset(row.original) ? (
            <span className="text-default-600 text-sm">All tenants</span>
          ) : (
            <ScopeLabel meta={toScopeMeta(toWireMeta(row.original.meta))} />
          ),
        size: 140,
      }),
      columnHelper.display({
        id: 'color',
        header: '',
        cell: ({ row }) =>
          isPreset(row.original) ? (
            <div
              className={`h-4 w-4 rounded-full ${badgeSwatchClasses[getStatusConfig(presetStatusName(row.original)).color]}`}
            />
          ) : (
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
            {/* Marks the row so index.css hides its selection checkbox:
                a preset has nothing to select, and ListPage offers no
                per-cell hook to leave the box out. */}
            {isPreset(row.original) && <span data-preset-row hidden />}
            <span className="text-sm font-medium">{row.original.name}</span>
            {row.original.isDefault && (
              <Chip size="sm" color="accent">
                Default
              </Chip>
            )}
            {row.original.isClosed && !isPreset(row.original) && (
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
        cell: ({ row }) =>
          isPreset(row.original) ? (
            <div className="-my-1.5 flex items-center justify-end">
              <PresetPill hint="Built into Helpdesk. Custom statuses map onto it; it can't be edited or deleted." />
            </div>
          ) : (
            <div className="-my-1.5 flex items-center justify-end gap-1">
              <IconTip label={'Edit status'}>
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-dark dark:text-light hover:text-blue"
                  aria-label="Edit status"
                  onPress={() => handleEdit(row.original)}
                  icon={<Icon name="pencil" className="h-4 w-4" />}
                />
              </IconTip>
              <IconTip label={'Delete status'}>
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
              </IconTip>
            </div>
          ),
        enableSorting: false,
        enableHiding: false,
        size: 80,
      }),
    ],
    [handleEdit, handleDeleteRequest],
  );

  const rows = useMemo(
    // One list in sort order, built-in and custom together. Array.sort is
    // stable, so on a tie a built-in status stays ahead of a custom one.
    () =>
      [...PRESET_STATUSES, ...scope.filteredRows].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [scope.filteredRows],
  );

  const table = useReactTable({
    data: rows,
    columns,
    // Keys row selection by the record's own id, matching `useScopeList`'s
    // `getRecordId` above -- required so `scope.rowSelection` (keyed by id)
    // and the table's own selection checkboxes agree on the same keys.
    getRowId: row => row.id,
    state: { rowSelection: scope.rowSelection },
    // Presets are not records, so there is nothing to re-scope.
    enableRowSelection: row => !isPreset(row.original),
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
          <PageHint>
            Custom statuses appear in the ticket status selector alongside the
            built-in New, In Progress and Closed. Each one maps to a built-in
            state, which is what SLAs and reports count.
          </PageHint>
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

export default CustomStatusesPage;
