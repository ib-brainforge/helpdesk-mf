/**
 * Principal approval workflows list page — /principal/[principalId]/approvals
 *
 * Admin-only. Lists principal-scoped approval workflows.
 * Create navigates to /approvals/new. Delete uses ConfirmDeleteModal.
 */

import { ConfirmDeleteModal } from '@/components/principal/ConfirmDeleteModal';
import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import {
  useDeletePrincipalApprovalWorkflow,
  usePrincipalApprovalWorkflows,
} from '@/hooks/usePrincipalApprovalWorkflows';
import { BaseButton, BaseTable, PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { toast, useOverlayState } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import type { PrincipalOutletContext } from '../layout';

// REVIEW: HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto not yet in published client.
// Remove once helpdesk-backend republishes with approval workflow DTO exported.
interface ApprovalWorkflowDto {
  id?: string;
  name?: string;
  description?: string | null;
  approvalMode?: string;
  isActive?: boolean;
  triggerOnCreation?: boolean;
  stepCount?: number;
}

const columnHelper = createColumnHelper<ApprovalWorkflowDto>();

function PrincipalApprovalsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const isDeleteState = useOverlayState();
  const isDeleteOpen = isDeleteState.isOpen;
  const onDeleteOpen = isDeleteState.open;
  const onDeleteClose = isDeleteState.close;
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');

  const {
    data: workflows,
    isLoading,
    error,
  } = usePrincipalApprovalWorkflows(principalId ?? '');
  const deleteMutation = useDeletePrincipalApprovalWorkflow(principalId ?? '');

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Approval workflow management requires admin access.
        </p>
      </div>
    );
  }

  const handleDeleteRequest = useCallback(
    (id: string, name: string) => {
      setPendingDeleteId(id);
      setPendingDeleteName(name);
      onDeleteOpen();
    },
    [onDeleteOpen],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDeleteId) return;
    deleteMutation.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast('Approval workflow deleted', { variant: 'success' });
        setPendingDeleteId(null);
      },
    });
  }, [pendingDeleteId, deleteMutation]);

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('approvalMode', {
      header: 'Mode',
      cell: info =>
        APPROVAL_MODE_LABELS[
          info.getValue() as keyof typeof APPROVAL_MODE_LABELS
        ] ?? info.getValue(),
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
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <BaseButton
            size="sm"
            variant="bordered"
            onPress={() =>
              navigate(`/principal/${principalId}/approvals/${row.original.id}`)
            }
          >
            Edit
          </BaseButton>
          <BaseButton
            size="sm"
            color="danger"
            variant="light"
            onPress={() =>
              handleDeleteRequest(row.original.id!, row.original.name!)
            }
            isDisabled={
              deleteMutation.isPending && pendingDeleteId === row.original.id
            }
          >
            Delete
          </BaseButton>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: (workflows ?? []) as ApprovalWorkflowDto[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approval Workflows</h1>
        <BaseButton
          onPress={() => navigate(`/principal/${principalId}/approvals/new`)}
        >
          New Workflow
        </BaseButton>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <PageSpinner title="Loading approval workflows..." />
        </div>
      )}

      {error && (
        <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
          Failed to load approval workflows. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <BaseTable
          table={table}
          isLoading={isLoading}
          loading={{ title: 'Loading...' }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Delete Approval Workflow"
        message={`Delete approval workflow "${pendingDeleteName}"? This cannot be undone.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

export default withAuthenticationRequired(PrincipalApprovalsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
