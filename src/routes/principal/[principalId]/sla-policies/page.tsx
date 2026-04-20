/**
 * Principal SLA policies list page — /principal/[principalId]/sla-policies
 *
 * Admin-only. Lists all principal-scoped SLA policies with create/edit/delete actions.
 * Wired to PrincipalSlaPoliciesApi from @brainforgeau/helpdesk-client.
 */

import {
  useCreatePrincipalSlaPolicy,
  useDeletePrincipalSlaPolicy,
  usePrincipalSlaPolicies,
} from '@/hooks/usePrincipalSlaPolicies';
import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseTable,
  PageSpinner,
} from '@brainforgeau/components';
import type { HelpdeskApplicationSlaDTOsSlaPolicyDto } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { addToast, useDisclosure } from '@heroui/react';
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
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onOpenChange: onCreateOpenChange,
  } = useDisclosure();

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);

  const {
    data: policies,
    isLoading,
    error,
  } = usePrincipalSlaPolicies(principalId ?? '');
  const createMutation = useCreatePrincipalSlaPolicy(principalId ?? '');
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

  const handleCreate = useCallback(
    (onClose: () => void) => {
      if (!newName.trim()) return;
      createMutation.mutate(
        {
          name: newName.trim(),
          description: newDescription.trim() || null,
          isDefault: newIsDefault,
        },
        {
          onSuccess: () => {
            addToast({ title: 'SLA policy created', severity: 'success' });
            setNewName('');
            setNewDescription('');
            setNewIsDefault(false);
            onClose();
          },
        },
      );
    },
    [newName, newDescription, newIsDefault, createMutation],
  );

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (!confirm(`Delete SLA policy "${name}"? This cannot be undone.`))
        return;
      deleteMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'SLA policy deleted', severity: 'success' }),
      });
    },
    [deleteMutation],
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
            onPress={() => handleDelete(row.original.id!, row.original.name!)}
            isLoading={deleteMutation.isPending}
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
        <BaseButton onPress={onCreateOpen}>New SLA Policy</BaseButton>
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

      {/* Create modal */}
      <BaseModal isOpen={isCreateOpen} onOpenChange={onCreateOpenChange}>
        <BaseModalContent>
          {onClose => (
            <>
              <BaseModalHeader>New SLA Policy</BaseModalHeader>
              <BaseModalBody className="flex flex-col gap-4">
                <BaseInput
                  label="Name"
                  value={newName}
                  onValueChange={setNewName}
                  placeholder="e.g. Standard SLA"
                  isRequired
                />
                <BaseInput
                  label="Description"
                  value={newDescription}
                  onValueChange={setNewDescription}
                  placeholder="Optional description"
                />
                <BaseCheckbox
                  isSelected={newIsDefault}
                  onValueChange={setNewIsDefault}
                >
                  Set as default policy
                </BaseCheckbox>
              </BaseModalBody>
              <BaseModalFooter>
                <BaseButton variant="light" onPress={onClose}>
                  Cancel
                </BaseButton>
                <BaseButton
                  color="primary"
                  onPress={() => handleCreate(onClose)}
                  isLoading={createMutation.isPending}
                  isDisabled={!newName.trim()}
                >
                  Create
                </BaseButton>
              </BaseModalFooter>
            </>
          )}
        </BaseModalContent>
      </BaseModal>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalSlaPoliciesPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
