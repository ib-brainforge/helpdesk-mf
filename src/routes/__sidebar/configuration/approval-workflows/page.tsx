import { IconTip, ScopeLabel } from '@/components/shared';
/**
 * Approval Workflows list — /__sidebar/configuration/approval-workflows
 *
 * Tenant-scoped CRUD backed by the real generated ApprovalWorkflowsApi
 * (GET list/detail, PUT, DELETE added alongside the pre-existing POST).
 */

import {
  type HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto,
  ScopeApi,
} from '@/api/helpdesk-client';
import {
  useApprovalWorkflows,
  useDeleteApprovalWorkflow,
} from '@/components/approvals';
import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  toBulkScopeSaveResult,
  toHelpdeskScopePatch,
  toScopeMeta,
  toWireMeta,
} from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BulkScopeEditor } from '@brainforgeau/components/bulk-scope-editor';
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
import { useNavigate } from '@modern-js/runtime/router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';

const columnHelper =
  createColumnHelper<HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto>();

function ApprovalWorkflowsPage() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const { data: workflows, isLoading, refetch } = useApprovalWorkflows();
  const deleteMutation = useDeleteApprovalWorkflow();

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

  const scope = useScopeList({
    rows: workflows ?? [],
    getMeta: row => toWireMeta(row.meta),
    getRecordId: row => row.id ?? '',
    getRecordLabel: row => row.name ?? '',
    accessScope,
    selectedContext,
    canManageScope,
    canViewScope: hasPlatformPermission(PlatformPermissions.Scope.Read),
    // entityType verified against helpdesk-backend's `HelpdeskDbContext`
    // (`DbSet<ApprovalWorkflow> ApprovalWorkflows`).
    patchScope: async (ids, patch) => {
      const client = await createHelpdeskApiClient(ScopeApi);
      const response = await client.v1ScopeEntityTypePatch('ApprovalWorkflow', {
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
    entityLabel: { one: 'approval workflow', other: 'approval workflows' },
  });

  const handleDeleteRequest = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: 'Delete Approval Workflow',
        body: `Delete approval workflow "${name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(id);
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: info => (
          <span className="font-medium">{info.getValue() ?? ''}</span>
        ),
      }),
      columnHelper.display({
        id: 'scope',
        header: 'Scope',
        cell: ({ row }) => (
          <ScopeLabel meta={toScopeMeta(toWireMeta(row.original.meta))} />
        ),
        size: 140,
      }),
      columnHelper.accessor('approvalMode', {
        header: 'Mode',
        cell: info => {
          const mode = info.getValue();
          return mode ? APPROVAL_MODE_LABELS[mode] : '';
        },
      }),
      columnHelper.accessor('stepCount', {
        header: 'Steps',
        cell: info => info.getValue() ?? 0,
      }),
      columnHelper.accessor('isActive', {
        header: 'Status',
        cell: info => (
          <span
            className={
              info.getValue() ? 'font-medium text-success' : 'text-default-400'
            }
          >
            {info.getValue() ? 'Active' : 'Inactive'}
          </span>
        ),
      }),
      columnHelper.accessor('triggerOnCreation', {
        header: 'On Create',
        cell: info => (info.getValue() ? 'Yes' : 'No'),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="-my-1.5 flex items-center justify-end gap-1">
            <IconTip label={'Edit approval workflow'}>
              <BaseButton
                variant="link"
                size="none"
                className="text-dark dark:text-light hover:text-blue"
                aria-label="Edit approval workflow"
                onPress={() =>
                  navigate(
                    `/configuration/approval-workflows/${row.original.id}`,
                  )
                }
                icon={<Icon name="pencil" className="h-4 w-4" />}
              />
            </IconTip>
            <IconTip label={'Delete approval workflow'}>
              <BaseButton
                variant="link"
                size="none"
                className="text-danger hover:text-danger-600"
                aria-label="Delete approval workflow"
                onPress={() =>
                  handleDeleteRequest(
                    row.original.id ?? '',
                    row.original.name ?? '',
                  )
                }
                isDisabled={deleteMutation.isPending}
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
    [
      currentOrganisationId,
      currentDivisionId,
      organisationCount,
      navigate,
      handleDeleteRequest,
      deleteMutation.isPending,
    ],
  );

  const table = useReactTable({
    data: scope.filteredRows,
    columns,
    // Keys row selection by the record's own id, matching `useScopeList`'s
    // `getRecordId` above -- required so `scope.rowSelection` (keyed by id)
    // and the table's own selection checkboxes agree on the same keys.
    getRowId: row => row.id ?? '',
    state: { rowSelection: scope.rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: scope.onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  return (
    <ListPage
      title="Approval Workflows"
      breadcrumbsKey="configuration.approval-workflows.list"
      table={table}
      isLoading={isLoading}
      // `selectionColumn`'s checkboxes are now wired to `scope.rowSelection`/
      // `onRowSelectionChange` (see `useReactTable()` above) -- selecting
      // rows here feeds `editorProps.selectedRecords`, so "Change scope"
      // (rendered inside `ListScopeStrip`'s `subheader` below) bulk-edits the
      // selection, same as `rowMarker`'s per-row scope border.
      tableProps={scope.tableProps}
      subheader={
        <ListScopeStrip {...scope.bannerProps}>
          {scope.isExpanded && <BulkScopeEditor {...scope.editorProps} />}
        </ListScopeStrip>
      }
      actions={
        <BaseButton
          color="primary"
          icon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onPress={() => navigate('/configuration/approval-workflows/new')}
        >
          Approval Workflow
        </BaseButton>
      }
      empty={
        <EmptyState
          title="No approval workflows yet"
          description="Create an approval workflow to define multi-step sign-off processes."
          action={
            <BaseButton
              color="primary"
              onPress={() => navigate('/configuration/approval-workflows/new')}
            >
              Approval Workflow
            </BaseButton>
          }
          live
        />
      }
      modals={dialog}
    />
  );
}

export default ApprovalWorkflowsPage;
