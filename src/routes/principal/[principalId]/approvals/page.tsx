/**
 * Principal approval workflows list page — /principal/[principalId]/approvals
 *
 * Admin-only. Lists principal-scoped approval workflows with create/edit/delete.
 * Wired to PrincipalApprovalsApi from @brainforgeau/helpdesk-client.
 */

import {
  useCreatePrincipalApprovalWorkflow,
  useDeletePrincipalApprovalWorkflow,
  usePrincipalApprovalWorkflows,
} from '@/hooks/usePrincipalApprovalWorkflows';
import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseSelect,
  BaseSelectItem,
  BaseTable,
  PageSpinner,
} from '@brainforgeau/components';
import {
  HelpdeskDomainApprovalsEnumsApprovalMode,
} from '@brainforgeau/helpdesk-client';

// REVIEW: HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto not yet in published client.
// Remove once helpdesk-backend republishes with approval workflow DTO exported.
interface HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto {
  id?: string;
  name?: string;
  description?: string | null;
  approvalMode?: string;
  isActive?: boolean;
  triggerOnCreation?: boolean;
  stepCount?: number;
}
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
  createColumnHelper<HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto>();

const APPROVAL_MODE_LABELS: Record<string, string> = {
  Sequential: 'Sequential',
  Parallel: 'Parallel',
  AnyOne: 'Any one approver',
};

function PrincipalApprovalsPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newApprovalMode, setNewApprovalMode] = useState<string>(
    HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
  );
  const [newIsActive, setNewIsActive] = useState(true);
  const [newTriggerOnCreation, setNewTriggerOnCreation] = useState(false);

  const {
    data: workflows,
    isLoading,
    error,
  } = usePrincipalApprovalWorkflows(principalId ?? '');
  const createMutation = useCreatePrincipalApprovalWorkflow(principalId ?? '');
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

  const handleCreate = useCallback(
    (onClose: () => void) => {
      if (!newName.trim()) return;
      createMutation.mutate(
        {
          name: newName.trim(),
          description: newDescription.trim() || null,
          approvalMode:
            newApprovalMode as HelpdeskDomainApprovalsEnumsApprovalMode,
          isActive: newIsActive,
          triggerOnCreation: newTriggerOnCreation,
          triggerOnStatusChange: false,
          steps: [],
        },
        {
          onSuccess: () => {
            addToast({
              title: 'Approval workflow created',
              severity: 'success',
            });
            setNewName('');
            setNewDescription('');
            setNewApprovalMode(
              HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
            );
            setNewIsActive(true);
            setNewTriggerOnCreation(false);
            onClose();
          },
        },
      );
    },
    [
      newName,
      newDescription,
      newApprovalMode,
      newIsActive,
      newTriggerOnCreation,
      createMutation,
    ],
  );

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (
        !confirm(`Delete approval workflow "${name}"? This cannot be undone.`)
      )
        return;
      deleteMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'Approval workflow deleted', severity: 'success' }),
      });
    },
    [deleteMutation],
  );

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('approvalMode', {
      header: 'Mode',
      cell: info =>
        APPROVAL_MODE_LABELS[info.getValue() ?? ''] ?? info.getValue(),
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
    data: workflows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approval Workflows</h1>
        <BaseButton onPress={onOpen}>New Workflow</BaseButton>
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

      <BaseModal isOpen={isOpen} onOpenChange={onOpenChange}>
        <BaseModalContent>
          {onClose => (
            <>
              <BaseModalHeader>New Approval Workflow</BaseModalHeader>
              <BaseModalBody className="flex flex-col gap-4">
                <BaseInput
                  label="Name"
                  value={newName}
                  onValueChange={setNewName}
                  placeholder="e.g. Manager Approval"
                  isRequired
                />
                <BaseInput
                  label="Description"
                  value={newDescription}
                  onValueChange={setNewDescription}
                  placeholder="Optional description"
                />
                <BaseSelect
                  label="Approval mode"
                  selectedKeys={[newApprovalMode]}
                  onSelectionChange={keys => {
                    const val = Array.from(keys)[0];
                    if (val) setNewApprovalMode(String(val));
                  }}
                >
                  {Object.entries(APPROVAL_MODE_LABELS).map(
                    ([value, label]) => (
                      <BaseSelectItem key={value}>{label}</BaseSelectItem>
                    ),
                  )}
                </BaseSelect>
                <div className="flex flex-col gap-2">
                  <BaseCheckbox
                    isSelected={newIsActive}
                    onValueChange={setNewIsActive}
                  >
                    Active
                  </BaseCheckbox>
                  <BaseCheckbox
                    isSelected={newTriggerOnCreation}
                    onValueChange={setNewTriggerOnCreation}
                  >
                    Trigger on ticket creation
                  </BaseCheckbox>
                </div>
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

export default withAuthenticationRequired(PrincipalApprovalsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
