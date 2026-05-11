/**
 * Principal SLA policies list page — /principal/[principalId]/sla-policies
 *
 * Admin-only. Lists all principal-scoped SLA policies.
 * Create navigates to /sla-policies/new. Delete uses ConfirmDeleteModal.
 */

import { ConfirmDeleteModal } from '@/components/principal/ConfirmDeleteModal';
import {
  useDeletePrincipalSlaPolicy,
  usePrincipalSlaPolicies,
} from '@/hooks/usePrincipalSlaPolicies';
import { BaseButton, BaseTable, PageSpinner } from '@brainforgeau/components';
import type { HelpdeskApplicationSlaDTOsSlaPolicyDto } from '@brainforgeau/helpdesk-client';
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

const columnHelper =
  createColumnHelper<HelpdeskApplicationSlaDTOsSlaPolicyDto>();

function PrincipalSlaPoliciesPage() {
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
        toast('SLA policy deleted', { variant: 'success' });
        setPendingDeleteId(null);
      },
    });
  }, [pendingDeleteId, deleteMutation]);

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

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Delete SLA Policy"
        message={`Delete SLA policy "${pendingDeleteName}"? This cannot be undone.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

export default withAuthenticationRequired(PrincipalSlaPoliciesPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
