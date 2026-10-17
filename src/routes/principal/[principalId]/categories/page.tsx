import { IconTip } from '@/components/shared';
/**
 * Principal categories list page — /principal/[principalId]/categories
 *
 * W1-P6: Migrated to <ListPage>. Admin-only (enforced by layout context check).
 * Async breadcrumb param principalName uses PendingCrumb permanently.
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { ACCESS_LEVEL_LABELS } from '@/constants/categoryLabels';
import { usePrincipal } from '@/hooks/usePrincipal';
import {
  useDeletePrincipalCategory,
  usePrincipalCategories,
} from '@/hooks/usePrincipalCategories';
import { BaseButton } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import {
  EmptyState,
  ListPage,
  PendingCrumb,
  useConfirm,
} from '@brainforgeau/components/page';
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
  const { data: principal } = usePrincipal(principalId);

  const { data: categories, isLoading } = usePrincipalCategories(
    principalId ?? '',
  );
  const deleteMutation = useDeletePrincipalCategory(principalId ?? '');

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
      header: '',
      cell: ({ row }) => (
        <div className="-my-1.5 flex items-center justify-end gap-1">
          <IconTip label={'Edit category'}>
            <BaseButton
              variant="link"
              size="none"
              className="text-dark dark:text-light hover:text-blue"
              aria-label="Edit category"
              onPress={() =>
                navigate(
                  `/principal/${principalId}/categories/${row.original.id}`,
                )
              }
              icon={<Icon name="pencil" className="h-4 w-4" />}
            />
          </IconTip>
          <IconTip label={'Delete category'}>
            <BaseButton
              variant="link"
              size="none"
              className="text-danger hover:text-danger-600"
              aria-label="Delete category"
              onPress={() =>
                handleDeleteRequest(row.original.id!, row.original.name!)
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
    data: categories ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Admin guard: layout enforces auth; this check handles the agent role case.
  if (context?.level !== 'admin') {
    return (
      <EmptyState
        title="Access Denied"
        description="Category management requires admin access."
      />
    );
  }

  return (
    <ListPage
      title="Categories"
      breadcrumbsKey="principal.categories.list"
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
          onPress={() => navigate(`/principal/${principalId}/categories/new`)}
        >
          New Category
        </BaseButton>
      }
      empty={
        <EmptyState
          title="No categories yet"
          description="Add the first category to start organising tickets for this principal."
          action={
            <BaseButton
              color="primary"
              onPress={() =>
                navigate(`/principal/${principalId}/categories/new`)
              }
            >
              New Category
            </BaseButton>
          }
          live
        />
      }
      modals={dialog}
    />
  );
}

export default withAuthenticationRequired(PrincipalCategoriesPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
