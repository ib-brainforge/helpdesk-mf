import {
  createApprovalWorkflowsColumns,
  useApprovalWorkflows,
  useApprovalWorkflowsTable,
  useDeleteApprovalWorkflow,
} from '@/components/approvals';
import {
  BaseButton,
  BaseTable,
  Icon,
  TablePagination,
} from '@brainforgeau/components';
import { useConfirm } from '@brainforgeau/components/page';
import { Helmet } from '@modern-js/runtime/head';
import { useNavigate } from '@modern-js/runtime/router';
import { useCallback, useMemo } from 'react';

// REVIEW: Following existing pattern from automation rules admin page

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
          refetch();
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

  const paginationTemplate = () => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    return (
      <TablePagination
        totalPages={totalPages}
        currentPage={pagination.pageIndex + 1}
        onPageChange={(page: number) =>
          setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
        }
      />
    );
  };

  return (
    <>
      <Helmet>
        <title>Approval Workflows - Configuration</title>
      </Helmet>
      <div className="mb-5">
        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Approval Workflows
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={() => navigate('/configuration/approval-workflows/new')}
            >
              Approval Workflow
            </BaseButton>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure approval workflows for tickets requiring managerial or team
          approval.
        </p>
      </div>

      <BaseTable
        fullHeight
        table={table}
        showInfo={false}
        paginationTemplate={paginationTemplate}
        isLoading={isLoading}
        loading={{ title: 'Loading...' }}
      />

      {dialog}
    </>
  );
}

export default ApprovalWorkflowsPage;
