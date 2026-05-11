import {
  createApprovalWorkflowsColumns,
  useApprovalWorkflows,
  useApprovalWorkflowsTable,
  useDeleteApprovalWorkflow,
} from '@/components/approvals';
import { BaseButton, Icon } from '@brainforgeau/components';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { useNavigate } from '@modern-js/runtime/router';
import { useCallback, useMemo } from 'react';

function ApprovalWorkflowsPage() {
  const navigate = useNavigate();
  const { items, totalCount, pagination, setPagination, isLoading, refetch } =
    useApprovalWorkflows();

  const deleteMutation = useDeleteApprovalWorkflow();
  const { confirm, dialog } = useConfirm();

  const handleEdit = useCallback(
    (workflowId: string) => {
      navigate(`/configuration/approval-workflows/${workflowId}`);
    },
    [navigate],
  );

  const handleDeleteRequest = useCallback(
    async (workflowId: string) => {
      const ok = await confirm({
        title: 'Delete Approval Workflow',
        body: 'Are you sure you want to delete this approval workflow? This cannot be undone.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(workflowId, {
        onSuccess: () => {
          toast('Deleted', {
            description: 'Approval workflow deleted successfully.',
            variant: 'success',
          });
          refetch();
        },
        onError: () => {
          toast('Error', {
            description: 'Failed to delete approval workflow.',
            variant: 'danger',
          });
        },
      });
    },
    [confirm, deleteMutation, refetch],
  );

  const columns = useMemo(
    () =>
      createApprovalWorkflowsColumns({
        onEdit: handleEdit,
        onDelete: handleDeleteRequest,
      }),
    [handleEdit, handleDeleteRequest],
  );

  const { table } = useApprovalWorkflowsTable({
    data: items,
    columns,
    totalCount,
    pagination,
    onPaginationChange: setPagination,
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
          description="Create your first approval workflow to require managerial sign-off on tickets."
          action={
            <BaseButton
              color="primary"
              onPress={() => navigate('/configuration/approval-workflows/new')}
            >
              Create Approval Workflow
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
