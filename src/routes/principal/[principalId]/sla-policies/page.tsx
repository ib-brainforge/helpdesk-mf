/**
 * Principal SLA policies list page — /principal/[principalId]/sla-policies
 *
 * Admin-only. Lists all principal-scoped SLA policies.
 * Create navigates to /sla-policies/new. Delete uses useConfirm.
 */

import {
  useDeletePrincipalSlaPolicy,
  usePrincipalSlaPolicies,
} from '@/hooks/usePrincipalSlaPolicies';
import { BaseButton, BaseTable, PageSpinner } from '@brainforgeau/components';
import { useConfirm } from '@brainforgeau/components/page';
import type { HelpdeskApplicationSlaDTOsSlaPolicyDto } from '@brainforgeau/helpdesk-client';
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
  createColumnHelper<HelpdeskApplicationSlaDTOsSlaPolicyDto>();

function PrincipalSlaPoliciesPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const {
    data: policies,
    isLoading,
    error,
  } = usePrincipalSlaPolicies(principalId ?? '');
  const deleteMutation = useDeletePrincipalSlaPolicy(principalId ?? '');

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          SLA policy management requires admin access.
        </p>
      </div>
    );
  }

  const handleDeleteRequest = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: 'Delete SLA Policy',
        body: `Delete SLA policy "${name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast('SLA policy deleted', { variant: 'success' });
        },
      });
    },
    [confirm, deleteMutation],
  );

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: info => (
        <span className="text-default-500">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('isDefault', {
      header: 'Default',
      cell: info => (
        <span
          className={
            info.getValue() ? 'font-medium text-success' : 'text-default-400'
          }
        >
          {info.getValue() ? 'Yes' : 'No'}
        </span>
      ),
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
              navigate(
                `/principal/${principalId}/sla-policies/${row.original.id}`,
              )
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
            isDisabled={deleteMutation.isPending}
          >
            Delete
          </BaseButton>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: policies ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SLA Policies</h1>
        <BaseButton
          onPress={() => navigate(`/principal/${principalId}/sla-policies/new`)}
        >
          New SLA Policy
        </BaseButton>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <PageSpinner title="Loading SLA policies..." />
        </div>
      )}

      {error && (
        <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
          Failed to load SLA policies. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <BaseTable
          table={table}
          isLoading={isLoading}
          loading={{ title: 'Loading...' }}
        />
      )}

      {dialog}
    </div>
  );
}

export default withAuthenticationRequired(PrincipalSlaPoliciesPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
