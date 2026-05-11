/**
 * Principal SLA policies list page — /principal/[principalId]/sla-policies
 *
 * W1-P6: Migrated to <ListPage>. Admin-only (enforced by layout context check).
 * Async breadcrumb param principalName uses PendingCrumb permanently.
 */

import {
  useDeletePrincipalSlaPolicy,
  usePrincipalSlaPolicies,
} from '@/hooks/usePrincipalSlaPolicies';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  EmptyState,
  ListPage,
  PendingCrumb,
  useConfirm,
} from '@brainforgeau/components/page';
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

  const { data: policies, isLoading } = usePrincipalSlaPolicies(
    principalId ?? '',
  );
  const deleteMutation = useDeletePrincipalSlaPolicy(principalId ?? '');

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

  // Admin guard: layout enforces auth; this check handles the agent role case.
  if (context?.level !== 'admin') {
    return (
      <EmptyState
        title="Access Denied"
        description="SLA policy management requires admin access."
      />
    );
  }

  return (
    <ListPage
      title="SLA Policies"
      breadcrumbsKey="principal.sla-policies.list"
      breadcrumbsParams={{
        principalId: principalId!,
        // REVIEW: principalName requires a lookup API (no usePrincipal hook yet).
        // Permanently uses PendingCrumb skeleton until plan-7 wires the hook.
        principalName: PendingCrumb,
      }}
      table={table}
      isLoading={isLoading}
      actions={
        <BaseButton
          color="primary"
          icon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onPress={() => navigate(`/principal/${principalId}/sla-policies/new`)}
        >
          New SLA Policy
        </BaseButton>
      }
      empty={
        <EmptyState
          title="No SLA policies yet"
          description="Create an SLA policy to define response and resolution time targets."
          action={
            <BaseButton
              color="primary"
              onPress={() =>
                navigate(`/principal/${principalId}/sla-policies/new`)
              }
            >
              New SLA Policy
            </BaseButton>
          }
          live
        />
      }
      modals={dialog}
    />
  );
}

export default withAuthenticationRequired(PrincipalSlaPoliciesPage, {
  OnRedirecting: () => null,
});
