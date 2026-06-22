import { CustomStatusEditorModal } from '@/components/custom-statuses/components/CustomStatusEditorModal';
import {
  useCustomStatuses,
  useDeleteCustomStatus,
} from '@/components/custom-statuses/hooks/useCustomStatuses';
import type { CustomTicketStatusDto } from '@/types/custom-status';
import { TicketStatus } from '@/types/custom-status';
import { BaseCard } from '@brainforgeau/components';
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
    [confirm, deleteMutation]
  );

  const columns = useMemo(
    (): ColumnDef<CustomTicketStatusDto, any>[] => [
      columnHelper.display({
        id: 'color',
        header: '',
        cell: ({ row }) => (
          <div
            className="border-light h-4 w-4 rounded-full border"
            style={{ backgroundColor: row.original.color ?? '#1868db' }}
          />
        ),
        size: 32,
      }),
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{row.original.name}</span>
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
          <span className="text-default-600 text-sm">
            {MAPS_TO_LABELS[row.original.mapsToStatus] ?? 'Unknown'}
          </span>
        ),
        size: 130,
      }),
      columnHelper.display({
        id: 'sortOrder',
        header: 'Sort Order',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">
            {row.original.sortOrder}
          </span>
        ),
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="-my-1.5 flex items-center justify-end gap-1">
            <BaseButton
              variant="link"
              size="none"
              className="text-dark dark:text-light hover:text-blue"
              aria-label="Edit status"
              onPress={() => handleEdit(row.original)}
              icon={<Icon name="pencil" className="h-4 w-4" />}
            />
            <BaseButton
              variant="link"
              size="none"
              className="text-danger hover:text-danger-600"
              aria-label="Delete status"
              onPress={() =>
                handleDeleteRequest(row.original.id, row.original.name)
              }
              icon={<Icon name="trash" className="h-4 w-4" />}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 80,
      }),
    ],
    [handleEdit, handleDeleteRequest]
  );

  const table = useReactTable({
    data: customStatuses,
    columns,
    getRowId: (row) => row.id,
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
        <BaseCard className="max-w-3xl">
          <p className="text-default-700 text-sm">
            Custom statuses appear in the ticket status selector alongside the
            built-in statuses (New, In Progress, Closed). Each custom status
            maps to a built-in lifecycle state for SLA and reporting
            calculations.
          </p>
        </BaseCard>
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
