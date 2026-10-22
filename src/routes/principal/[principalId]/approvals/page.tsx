import { IconTip } from '@/components/shared';
/**
 * Principal approval workflows list page — /principal/[principalId]/approvals
 *
 * W1-P6: Migrated to <ListPage>. Admin-only (enforced by layout context check).
 * Async breadcrumb param principalName uses PendingCrumb permanently.
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import { usePrincipal } from '@/hooks/usePrincipal';
import {
  useDeletePrincipalApprovalWorkflow,
  usePrincipalApprovalWorkflows,
} from '@/hooks/usePrincipalApprovalWorkflows';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  EmptyState,
  ListPage,
  PendingCrumb,
  useConfirm,
} from '@brainforgeau/components/page';
import type { HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { toast } from '@heroui/react';
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
import { useCallback } from 'react';
import type { PrincipalOutletContext } from '../layout';

const columnHelper =
  createColumnHelper<HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto>();

function PrincipalApprovalsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const { data: principal } = usePrincipal(principalId);

  const { data: workflows, isLoading } = usePrincipalApprovalWorkflows(
    principalId ?? '',
  );
  const deleteMutation = useDeletePrincipalApprovalWorkflow(principalId ?? '');

  const handleDeleteRequest = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: 'Delete Approval Workflow',
        body: `Delete approval workflow "${name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast('Approval workflow deleted', { variant: 'success' });
        },
      });
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
          <IconTip label={'Edit approval workflow'}>
            <BaseButton
              variant="link"
              size="none"
              className="text-dark dark:text-light hover:text-blue"
              aria-label="Edit approval workflow"
              onPress={() =>
                navigate(
                  `/principal/${principalId}/approvals/${row.original.id}`,
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
  ];

  const table = useReactTable({
    data: workflows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Admin guard: layout enforces auth; this check handles the agent role case.
  if (context?.level !== 'admin') {
    return (
      <EmptyState
        title="Access Denied"
        description="Approval workflow management requires admin access."
      />
    );
  }

  return (
    <ListPage
      title="Approval Workflows"
      breadcrumbsKey="principal.approvals.list"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
      }}
      table={table}
      isLoading={isLoading}
      actions={
        <BaseButton
          color="primary"
          icon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onPress={() => navigate(`/principal/${principalId}/approvals/new`)}
        >
          New Workflow
        </BaseButton>
      }
      empty={
        <EmptyState
          title="No approval workflows yet"
          description="Create an approval workflow to define multi-step sign-off processes."
          action={
            <BaseButton
              color="primary"
              onPress={() =>
                navigate(`/principal/${principalId}/approvals/new`)
              }
            >
              New Workflow
            </BaseButton>
          }
          live
        />
      }
      modals={dialog}
    />
  );
}

export default withAuthenticationRequired(PrincipalApprovalsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
