import { CustomStatusEditorModal } from '@/components/custom-statuses/components/CustomStatusEditorModal';
import {
  useCustomStatuses,
  useDeleteCustomStatus,
} from '@/components/custom-statuses/hooks/useCustomStatuses';
import type { CustomTicketStatusDto } from '@/types/custom-status';
import { TicketStatus } from '@/types/custom-status';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';
import { Chip, toast } from '@heroui/react';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

const MAPS_TO_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'New',
  [TicketStatus.InProgress]: 'In Progress',
  [TicketStatus.Closed]: 'Closed',
};

const columnHelper = createColumnHelper<CustomTicketStatusDto>();

function CustomStatusesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<
    CustomTicketStatusDto | undefined
  >();

  const { customStatuses, isLoading } = useCustomStatuses();
  const deleteMutation = useDeleteCustomStatus();
  const { confirm, dialog } = useConfirm();

  const handleCreate = () => {
    setEditingStatus(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((status: CustomTicketStatusDto) => {
    setEditingStatus(status);
    setIsModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: 'Delete Custom Status',
        body: `Are you sure you want to delete "${name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteMutation.mutateAsync(id);
        toast('Deleted', {
          description: 'Custom status deleted',
          variant: 'success',
        });
      } catch {
        toast('Error', {
          description: 'Failed to delete custom status',
          variant: 'danger',
        });
      }
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo(
    (): ColumnDef<CustomTicketStatusDto, any>[] => [
      columnHelper.display({
        id: 'color',
        header: '',
        cell: ({ row }) => (
          <div
            className="w-4 h-4 rounded-full border border-default-200"
            style={{ backgroundColor: row.original.color ?? '#6366f1' }}
          />
        ),
        size: 32,
      }),
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{row.original.name}</span>
            {row.original.isDefault && (
              <Chip size="sm" color="accent">
                Default
              </Chip>
            )}
            {row.original.isClosed && (
              <Chip size="sm" color="success">
                Counts as Closed
              </Chip>
            )}
            {!row.original.isActive && (
              <Chip size="sm" color="default">
                Inactive
              </Chip>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'mapsTo',
        header: 'Maps To',
        cell: ({ row }) => (
          <span className="text-sm text-default-600">
            {MAPS_TO_LABELS[row.original.mapsToStatus] ?? 'Unknown'}
          </span>
        ),
        size: 130,
      }),
      columnHelper.display({
        id: 'sortOrder',
        header: 'Sort Order',
        cell: ({ row }) => (
          <span className="text-sm text-default-600">
            {row.original.sortOrder}
          </span>
        ),
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <BaseButton
              size="sm"
              variant="light"
              isIconOnly
              onPress={() => handleEdit(row.original)}
              aria-label="Edit status"
            >
              <Icon name="pencil-square" className="h-4 w-4" />
            </BaseButton>
            <BaseButton
              size="sm"
              variant="light"
              color="danger"
              isIconOnly
              onPress={() =>
                handleDeleteRequest(row.original.id, row.original.name)
              }
              aria-label="Delete status"
            >
              <Icon name="trash" className="h-4 w-4" />
            </BaseButton>
          </div>
        ),
        size: 80,
      }),
    ],
    [handleEdit, handleDeleteRequest],
  );

  const table = useReactTable({
    data: customStatuses,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  return (
    <ListPage
      title="Custom Statuses"
      breadcrumbsKey="configuration.custom-statuses.list"
      table={table}
      isLoading={isLoading}
      actions={
        <BaseButton
          color="primary"
          onPress={handleCreate}
          icon={<Icon name="plus" className="h-4 w-4" />}
        >
          Add Status
        </BaseButton>
      }
      subheader={
        <div className="p-4 bg-default-50 rounded-lg border border-default-200 max-w-3xl">
          <p className="text-sm text-default-700">
            Custom statuses appear in the ticket status selector alongside the
            built-in statuses (New, In Progress, Closed). Each custom status
            maps to a built-in lifecycle state for SLA and reporting
            calculations.
          </p>
        </div>
      }
      empty={
        <EmptyState
          title="No custom statuses yet"
          description="Add your first custom status to extend the built-in ticket lifecycle."
          action={
            <BaseButton color="primary" size="sm" onPress={handleCreate}>
              Create First Status
            </BaseButton>
          }
          live
        />
      }
      modals={
        <>
          <CustomStatusEditorModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingStatus(undefined);
            }}
            status={editingStatus}
          />
          {dialog}
        </>
      }
    />
  );
}

export default withAuthorizationRequired(CustomStatusesPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
