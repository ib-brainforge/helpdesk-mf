/**
 * Principal automation rules list page — /principal/[principalId]/automation
 *
 * Admin-only. Lists principal-scoped automation rules with pagination.
 * Wired to PrincipalAutomationApi from @brainforgeau/helpdesk-client.
 */

import {
  useDeletePrincipalAutomationRule,
  usePrincipalAutomation,
} from '@/hooks/usePrincipalAutomation';
import {
  BaseButton,
  BaseTable,
  PageSpinner,
  TablePagination,
} from '@brainforgeau/components';
import { formatDateTime } from '@brainforgeau/components/utils';
import type { HelpdeskApplicationAutomationDTOsAutomationRuleListDto } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useTimezone } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
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
  createColumnHelper<HelpdeskApplicationAutomationDTOsAutomationRuleListDto>();

function PrincipalAutomationPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const timezone = useTimezone();

  const { items, totalCount, pagination, setPagination, isLoading, error } =
    usePrincipalAutomation(principalId ?? '');
  const deleteMutation = useDeletePrincipalAutomationRule(principalId ?? '');

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Automation management requires admin access.
        </p>
      </div>
    );
  }

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (!confirm(`Delete automation rule "${name}"? This cannot be undone.`))
        return;
      deleteMutation.mutate(id, {
        onSuccess: () =>
          addToast({ title: 'Automation rule deleted', severity: 'success' }),
      });
    },
    [deleteMutation],
  );

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('triggerType', {
      header: 'Trigger',
      cell: info => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('isEnabled', {
      header: 'Status',
      cell: info => (
        <span
          className={
            info.getValue() ? 'font-medium text-success' : 'text-default-400'
          }
        >
          {info.getValue() ? 'Enabled' : 'Disabled'}
        </span>
      ),
    }),
    columnHelper.accessor('conditionCount', {
      header: 'Conditions',
      cell: info => info.getValue() ?? 0,
    }),
    columnHelper.accessor('actionCount', {
      header: 'Actions',
      cell: info => info.getValue() ?? 0,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: info =>
        info.getValue() ? formatDateTime(info.getValue()!, { timezone }) : '—',
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
                `/principal/${principalId}/automation/${row.original.id}`,
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
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const paginationTemplate = () => (
    <TablePagination
      totalPages={totalPages}
      currentPage={pagination.pageIndex + 1}
      onPageChange={page =>
        setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
      }
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Automation Rules</h1>
        <BaseButton
          onPress={() => navigate(`/principal/${principalId}/automation/new`)}
        >
          New Rule
        </BaseButton>
      </div>

      {error && (
        <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
          Failed to load automation rules. Please try again.
        </div>
      )}

      <BaseTable
        table={table}
        isLoading={isLoading}
        loading={{ title: 'Loading...' }}
        paginationTemplate={paginationTemplate}
      />
    </div>
  );
}

export default withAuthenticationRequired(PrincipalAutomationPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
