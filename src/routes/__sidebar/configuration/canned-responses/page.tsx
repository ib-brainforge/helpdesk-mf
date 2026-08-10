import { CannedResponseEditorModal } from '@/components/canned-responses/components/CannedResponseEditorModal';
import {
  useCannedResponses,
  useDeleteCannedResponse,
} from '@/components/canned-responses/hooks/useCannedResponses';
import { ScopePermissions } from '@/constants/permissions';
import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CannedResponseDto } from '@/types/canned-response';
import { CannedResponseScope } from '@/types/canned-response';
import {
  toBulkScopeSaveResult,
  toHelpdeskScopePatch,
  toScopeMeta,
  toWireMeta,
} from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import { BaseInput } from '@brainforgeau/components';
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
import { useAccessScope, usePermissions } from '@brainforgeau/security';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

const columnHelper = createColumnHelper<CannedResponseDto>();

const SCOPE_COLORS: Record<CannedResponseScope, string> = {
  [CannedResponseScope.Personal]: 'bg-default-100 text-default-800',
  [CannedResponseScope.Shared]: 'bg-primary-100 text-primary-800',
};

const SCOPE_LABELS: Record<CannedResponseScope, string> = {
  [CannedResponseScope.Personal]: 'Personal',
  [CannedResponseScope.Shared]: 'Shared',
};

function getScopeBadge(scope: CannedResponseScope) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${SCOPE_COLORS[scope]}`}>
      {SCOPE_LABELS[scope]}
    </span>
  );
}

function CannedResponsesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<
    CannedResponseDto | undefined
  >();

  const { cannedResponses, isLoading, refetch } = useCannedResponses(
    undefined,
    searchTerm,
  );
  const deleteMutation = useDeleteCannedResponse();
  const { confirm, dialog } = useConfirm();

  // DTO tenancy/scope metadata initiative -- see useAccessScope for why this
  // isn't @brainforgeau/security's useHierarchicalContext.
  const selectedContext = useAtomValue(selectedContextAtom);
  const { accessScope, organisationCount } = useAccessScope(
    selectedContext?.tenantId,
    { identityBaseUrl: requireIdentityApiBaseUrl() },
  );
  const { hasPermission } = usePermissions();
  const canManageScope = hasPermission(ScopePermissions.Manage);
  const currentOrganisationId = selectedContext?.organisationId;
  const currentDivisionId = selectedContext?.divisionId;

  const scope = useScopeList({
    rows: cannedResponses,
    getMeta: row => toWireMeta(row.meta),
    getRecordId: row => row.id ?? '',
    getRecordLabel: row => row.title ?? '',
    accessScope,
    selectedContext,
    canManageScope,
    // entityType verified against helpdesk-backend's `HelpdeskDbContext`
    // (`DbSet<CannedResponse> CannedResponses`).
    patchScope: async (ids, patch) => {
      const client = await createHelpdeskApiClient(ScopeApi);
      const response = await client.v1ScopeEntityTypePatch('CannedResponse', {
        ids,
        patch: toHelpdeskScopePatch(patch),
      });
      return toBulkScopeSaveResult(response.data);
    },
    refetch: async () => {
      await refetch();
    },
    // REVIEW: TEMPORARY -- see SCOPE_TESTING_BYPASS_SINGLE_ORG's doc comment
    // in scopeTestingBypass.ts. Remove this line to revert.
    bypassSingleOrganisationSuppressionForTesting:
      SCOPE_TESTING_BYPASS_SINGLE_ORG,
    entityLabel: { one: 'canned response', other: 'canned responses' },
  });

  const handleCreate = () => {
    setEditingResponse(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = useCallback((response: CannedResponseDto) => {
    setEditingResponse(response);
    setIsEditorOpen(true);
  }, []);

  const handleDeleteRequest = useCallback(
    async (id: string, title: string) => {
      const ok = await confirm({
        title: 'Delete Canned Response',
        body: `Are you sure you want to delete "${title}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteMutation.mutateAsync(id);
        toast('Deleted', {
          description: 'Canned response deleted successfully',
          variant: 'success',
        });
      } catch {
        toast('Error', {
          description: 'Failed to delete canned response',
          variant: 'danger',
        });
      }
    },
    [confirm, deleteMutation],
  );

  const handleExportCSV = () => {
    // REVIEW: Export functionality to be implemented
    toast('Coming soon', {
      description: 'CSV export will be available soon',
      variant: 'warning',
    });
  };

  const columns = useMemo(
    (): ColumnDef<CannedResponseDto, any>[] => [
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleEdit(row.original)}
            className="text-primary hover:underline font-medium"
          >
            {row.original.title}
          </button>
        ),
      }),
      columnHelper.display({
        id: 'scope',
        header: 'Scope',
        cell: ({ row }) =>
          getScopeBadge(row.original.scope as CannedResponseScope),
        size: 120,
      }),
      columnHelper.display({
        id: 'placement',
        header: 'Placement',
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
        id: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-default-600">
            {row.original.categoryName || '—'}
          </span>
        ),
        size: 160,
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
              aria-label="Edit canned response"
              onPress={() => handleEdit(row.original)}
              icon={<Icon name="pencil" className="h-4 w-4" />}
            />
            <BaseButton
              variant="link"
              size="none"
              className="text-danger hover:text-danger-600"
              aria-label="Delete canned response"
              onPress={() =>
                handleDeleteRequest(
                  row.original.id ?? '',
                  row.original.title ?? '',
                )
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

  const table = useReactTable<CannedResponseDto>({
    data: scope.filteredRows,
    columns,
    getRowId: row => row.id ?? '',
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  return (
    <ListPage
      title="Canned Responses"
      breadcrumbsKey="configuration.canned-responses.list"
      table={table}
      isLoading={isLoading}
      // REVIEW: see the equivalent comment on the custom-statuses list page --
      // `selectionColumn` renders uncontrolled/inert here (no bulk toolbar
      // consumes it); `rowMarker` is the change actually motivating this.
      tableProps={scope.tableProps}
      subheader={
        <ListScopeStrip {...scope.bannerProps}>
          {scope.isExpanded && <BulkScopeEditor {...scope.editorProps} />}
        </ListScopeStrip>
      }
      actions={
        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            onPress={handleExportCSV}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export (CSV)
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleCreate}
            icon={<Icon name="plus" className="h-4 w-4" />}
          >
            Create
          </BaseButton>
        </div>
      }
      filters={
        <BaseInput
          placeholder="Search canned responses..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          startContent={
            <Icon
              name="magnifying-glass"
              className="h-4 w-4 text-default-400"
            />
          }
          className="max-w-md"
        />
      }
      hasActiveFilters={searchTerm.length > 0}
      onClearFilters={() => setSearchTerm('')}
      empty={
        <EmptyState
          title="No canned responses yet"
          description="Create your first canned response to get started."
          action={
            <BaseButton color="primary" onPress={handleCreate}>
              Create Canned Response
            </BaseButton>
          }
          live
        />
      }
      modals={
        <>
          <CannedResponseEditorModal
            isOpen={isEditorOpen}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingResponse(undefined);
            }}
            cannedResponse={editingResponse}
          />
          {dialog}
        </>
      }
    />
  );
}

export default withAuthorizationRequired(CannedResponsesPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
