/**
 * Principal categories list page — /principal/[principalId]/categories
 *
 * Admin-only. Lists all principal-scoped categories.
 * Create navigates to /categories/new. Delete uses useConfirm.
 */

import { ACCESS_LEVEL_LABELS } from '@/constants/categoryLabels';
import {
  useDeletePrincipalCategory,
  usePrincipalCategories,
} from '@/hooks/usePrincipalCategories';
import { BaseButton, BaseTable, PageSpinner } from '@brainforgeau/components';
import { useConfirm } from '@brainforgeau/components/page';
import type { HelpdeskApplicationCategoriesModelsCategoryDto } from '@brainforgeau/helpdesk-client';
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
  createColumnHelper<HelpdeskApplicationCategoriesModelsCategoryDto>();

function PrincipalCategoriesPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const {
    data: categories,
    isLoading,
    error,
  } = usePrincipalCategories(principalId ?? '');
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

  const handleDeleteRequest = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: 'Delete Category',
        body: `Delete category "${name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast('Category deleted', { variant: 'success' });
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
    columnHelper.accessor('accessLevel', {
      header: 'Access',
      cell: info =>
        ACCESS_LEVEL_LABELS[
          info.getValue() as keyof typeof ACCESS_LEVEL_LABELS
        ] ?? info.getValue(),
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
    data: categories ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <BaseButton
          onPress={() => navigate(`/principal/${principalId}/categories/new`)}
        >
          New Category
        </BaseButton>
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

      {dialog}
    </div>
  );
}

export default withAuthenticationRequired(PrincipalCategoriesPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
