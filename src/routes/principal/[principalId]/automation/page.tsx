/**
 * Principal automation rules list page — /principal/[principalId]/automation
 *
 * Admin-only. Lists principal-scoped automation rules with pagination.
 * Each row has an inline enable/disable toggle using dedicated endpoints
 * (isEnabled is not editable via the update command).
 */

import {
  useDeletePrincipalAutomationRule,
  useDisablePrincipalAutomationRule,
  useEnablePrincipalAutomationRule,
  usePrincipalAutomation,
} from '@/hooks/usePrincipalAutomation';
import { ConfirmDeleteModal } from '@/components/principal/ConfirmDeleteModal';
import { TRIGGER_LABELS } from '@/constants/automationLabels';
import {
  BaseButton,
  BaseTable,
  BaseToggle,
  PageSpinner,
  TablePagination,
} from '@brainforgeau/components';
import { formatDateTime } from '@brainforgeau/components/utils';
import type { HelpdeskApplicationAutomationDTOsAutomationRuleListDto } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useTimezone } from '@brainforgeau/security';
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
  createColumnHelper<HelpdeskApplicationAutomationDTOsAutomationRuleListDto>();

function PrincipalAutomationPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();
  const timezone = useTimezone();

  const { items, totalCount, pagination, setPagination, isLoading, error } =
    usePrincipalAutomation(principalId ?? '');
  const deleteMutation = useDeletePrincipalAutomationRule(principalId ?? '');
  const enableMutation = useEnablePrincipalAutomationRule(principalId ?? '');
  const disableMutation = useDisablePrincipalAutomationRule(principalId ?? '');

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');

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
        addToast({ title: 'Automation rule deleted', severity: 'success' });
        setPendingDeleteId(null);
      },
    });
  }, [pendingDeleteId, deleteMutation]);

  const handleToggleEnabled = useCallback(
    (id: string, currentlyEnabled: boolean) => {
      const onError = () =>
        addToast({
          title: 'Enable/disable not yet available',
          description: 'This feature is pending a backend update.',
          severity: 'warning',
        });
      if (currentlyEnabled) {
        disableMutation.mutate(id, {
          onSuccess: () =>
            addToast({ title: 'Rule disabled', severity: 'success' }),
          onError,
        });
      } else {
        enableMutation.mutate(id, {
          onSuccess: () =>
            addToast({ title: 'Rule enabled', severity: 'success' }),
          onError,
        });
      }
    },
    [enableMutation, disableMutation],
  );

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('triggerType', {
      header: 'Trigger',
      cell: info => (
        <span className="text-sm">
          {TRIGGER_LABELS[info.getValue() as keyof typeof TRIGGER_LABELS] ??
            info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('isEnabled', {
      header: 'Enabled',
      cell: info => (
        <BaseToggle
          isSelected={info.getValue() ?? false}
          onValueChange={() =>
            handleToggleEnabled(
              info.row.original.id ?? '',
              info.getValue() ?? false,
            )
          }
          aria-label={info.getValue() ? 'Disable rule' : 'Enable rule'}
          isDisabled={
            enableMutation.isPending || disableMutation.isPending
          }
          size="sm"
        />
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
      id: 'row-actions',
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
            onPress={() =>
              handleDeleteRequest(row.original.id!, row.original.name!)
            }
            isLoading={deleteMutation.isPending && pendingDeleteId === row.original.id}
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

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Delete Automation Rule"
        message={`Delete automation rule "${pendingDeleteName}"? This cannot be undone.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

export default withAuthenticationRequired(PrincipalAutomationPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
