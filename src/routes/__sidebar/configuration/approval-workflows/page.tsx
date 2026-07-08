/**
 * Approval Workflows list — /__sidebar/configuration/approval-workflows
 *
 * Tenant-scoped CRUD backed by the real generated ApprovalWorkflowsApi
 * (GET list/detail, PUT, DELETE added alongside the pre-existing POST).
 */

import {
  useApprovalWorkflows,
  useDeleteApprovalWorkflow,
} from '@/components/approvals';
import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import type { HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto } from '@brainforgeau/helpdesk-client';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { useNavigate } from '@modern-js/runtime/router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback } from 'react';

const columnHelper =
  createColumnHelper<HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto>();

function ApprovalWorkflowsPage() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const { data: workflows, isLoading } = useApprovalWorkflows();
  const deleteMutation = useDeleteApprovalWorkflow();

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

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => (
        <span className="font-medium">{info.getValue() ?? ''}</span>
      ),
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
          <BaseButton
            variant="link"
            size="none"
            className="text-dark dark:text-light hover:text-blue"
            aria-label="Edit approval workflow"
            onPress={() =>
              navigate(`/configuration/approval-workflows/${row.original.id}`)
            }
            icon={<Icon name="pencil" className="h-4 w-4" />}
          />
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
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 80,
    }),
  ];

  const table = useReactTable({
    data: workflows ?? [],
    columns,
    getRowId: row => row.id ?? '',
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  return (
    <ListPage
      title="Approval Workflows"
      breadcrumbsKey="configuration.approval-workflows.list"
      table={table}
      isLoading={isLoading}
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

export default withAuthorizationRequired(ApprovalWorkflowsPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
