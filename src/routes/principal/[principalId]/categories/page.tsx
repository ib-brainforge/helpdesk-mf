/**
 * Principal categories list page — /principal/[principalId]/categories
 *
 * Admin-only. Lists all principal-scoped categories with create/edit/delete actions.
 * Wired to PrincipalCategoriesApi from @brainforgeau/helpdesk-client.
 */

import {
  useCreatePrincipalCategory,
  useDeletePrincipalCategory,
  usePrincipalCategories,
} from '@/hooks/usePrincipalCategories';
import {
  BaseButton,
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
  type HelpdeskApplicationCategoriesModelsCategoryDto,
  HelpdeskDomainCategoriesEnumsAccessLevel,
} from '@brainforgeau/helpdesk-client';
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
  createColumnHelper<HelpdeskApplicationCategoriesModelsCategoryDto>();

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  Everyone: 'Everyone',
  AgentsOnly: 'Agents only',
  AdminsOnly: 'Admins only',
};

function PrincipalCategoriesPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAccessLevel, setNewAccessLevel] = useState<string>(
    HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
  );

  const {
    data: categories,
    isLoading,
    error,
  } = usePrincipalCategories(principalId ?? '');
  const createMutation = useCreatePrincipalCategory(principalId ?? '');
  const deleteMutation = useDeletePrincipalCategory(principalId ?? '');

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Category management requires admin access.
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
          accessLevel:
            newAccessLevel as HelpdeskDomainCategoriesEnumsAccessLevel,
          sortOrder: 0,
        },
        {
          onSuccess: () => {
            addToast({ title: 'Category created', severity: 'success' });
            setNewName('');
            setNewDescription('');
            setNewAccessLevel(
              HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
            );
            onClose();
          },
        },
      );
    },
    [newName, newDescription, newAccessLevel, createMutation],
  );

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
      deleteMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'Category deleted', severity: 'success' }),
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
    columnHelper.accessor('accessLevel', {
      header: 'Access',
      cell: info =>
        ACCESS_LEVEL_LABELS[info.getValue() ?? ''] ?? info.getValue(),
    }),
    columnHelper.accessor('isActive', {
      header: 'Active',
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
                `/principal/${principalId}/categories/${row.original.id}`,
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
    data: categories ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <BaseButton onPress={onOpen}>New Category</BaseButton>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <PageSpinner title="Loading categories..." />
        </div>
      )}

      {error && (
        <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
          Failed to load categories. Please try again.
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
              <BaseModalHeader>New Category</BaseModalHeader>
              <BaseModalBody className="flex flex-col gap-4">
                <BaseInput
                  label="Name"
                  value={newName}
                  onValueChange={setNewName}
                  placeholder="e.g. Technical Support"
                  isRequired
                />
                <BaseInput
                  label="Description"
                  value={newDescription}
                  onValueChange={setNewDescription}
                  placeholder="Optional description"
                />
                <BaseSelect
                  label="Access level"
                  selectedKeys={[newAccessLevel]}
                  onSelectionChange={keys => {
                    const val = Array.from(keys)[0];
                    if (val) setNewAccessLevel(String(val));
                  }}
                >
                  {Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => (
                    <BaseSelectItem key={value}>{label}</BaseSelectItem>
                  ))}
                </BaseSelect>
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

export default withAuthenticationRequired(PrincipalCategoriesPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
