import { CustomPriorityEditorModal } from '@/components/custom-priorities/components/CustomPriorityEditorModal';
import {
  type CustomPriorityDto,
  useCustomPriorities,
  useDeleteCustomPriority,
} from '@/components/custom-priorities/hooks/useCustomPriorities';
import {
  IconTip,
  PageHint,
  PresetPill,
  ScopeLabel,
  badgeSwatchClasses,
} from '@/components/shared';
import { getPriorityConfig } from '@/components/tickets/ticket-priority-config';
import { TicketPriority } from '@/types/ticket';
import { extractErrorMessage } from '@/utils/error-handling';
import { toScopeMeta, toWireMeta } from '@/utils/scopeMeta';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { ListPage, useConfirm } from '@brainforgeau/components/page';
import { toast } from '@heroui/react';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

/*
 * A row is either one of the tenant's own priorities or one of the built-in
 * ones every ticket can be given. Built-ins are listed so the page shows the
 * whole set; they are marked Preset and read only.
 */
type PriorityRow = { id: string; name: string; sortOrder: number } & (
  | { kind: 'custom'; priority: CustomPriorityDto }
  | { kind: 'preset'; preset: TicketPriority }
);

const PRESET_ROWS: PriorityRow[] = [
  TicketPriority.Critical,
  TicketPriority.High,
  TicketPriority.Normal,
  TicketPriority.Low,
].map((preset, index) => ({
  kind: 'preset',
  id: `preset-priority-${preset}`,
  name: getPriorityConfig(preset).label,
  // Highest first, the order the ticket priority picker shows them in.
  sortOrder: index + 1,
  preset,
}));

const columnHelper = createColumnHelper<PriorityRow>();

function CustomPrioritiesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomPriorityDto | undefined>();
  const { customPriorities, isLoading } = useCustomPriorities();
  const deleteMutation = useDeleteCustomPriority();
  const { confirm, dialog } = useConfirm();

  const handleCreate = () => {
    setEditing(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((priority: CustomPriorityDto) => {
    setEditing(priority);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (priority: CustomPriorityDto) => {
      const ok = await confirm({
        title: 'Delete custom priority?',
        body: `Delete "${priority.name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok || !priority.id) return;
      try {
        await deleteMutation.mutateAsync(priority.id);
        toast('Deleted', {
          description: 'Custom priority deleted',
          variant: 'success',
        });
      } catch (error) {
        toast(`Couldn't delete "${priority.name}"`, {
          description: extractErrorMessage(error, 'Please try again.'),
          variant: 'danger',
        });
      }
    },
    [confirm, deleteMutation],
  );

  const rows = useMemo<PriorityRow[]>(
    () =>
      // One list in sort order, built-in and custom together, so the table
      // shows the order they come in. Array.sort is stable, so on a tie a
      // built-in stays ahead of a custom priority.
      [
        ...PRESET_ROWS,
        ...customPriorities.map(priority => ({
          kind: 'custom' as const,
          id: priority.id ?? '',
          name: priority.name ?? '',
          sortOrder: priority.sortOrder ?? 0,
          priority,
        })),
      ].sort((a, b) => a.sortOrder - b.sortOrder),
    [customPriorities],
  );

  const columns = useMemo(
    (): ColumnDef<PriorityRow, any>[] => [
      columnHelper.display({
        id: 'color',
        header: '',
        cell: ({ row }) =>
          row.original.kind === 'preset' ? (
            <div
              className={`h-4 w-4 rounded-full ${badgeSwatchClasses[getPriorityConfig(row.original.preset).color]}`}
            />
          ) : (
            <div
              className="border-light h-4 w-4 rounded-full border"
              style={{
                backgroundColor: row.original.priority.color ?? '#6366f1',
              }}
            />
          ),
        size: 32,
      }),
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.name}</span>
        ),
      }),
      columnHelper.display({
        id: 'scope',
        header: 'Scope',
        cell: ({ row }) =>
          row.original.kind === 'preset' ? (
            <span className="text-default-600 text-sm">All tenants</span>
          ) : (
            <ScopeLabel
              meta={toScopeMeta(toWireMeta(row.original.priority.meta))}
            />
          ),
        size: 180,
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
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === 'preset') {
            return (
              <div className="-my-1.5 flex items-center justify-end">
                <PresetPill hint="Built into Helpdesk. It can't be edited or deleted." />
              </div>
            );
          }
          return (
            <div className="-my-1.5 flex items-center justify-end gap-1">
              <IconTip label="Edit priority">
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-dark dark:text-light hover:text-blue"
                  aria-label="Edit priority"
                  onPress={() => handleEdit(r.priority)}
                  icon={<Icon name="pencil" className="h-4 w-4" />}
                />
              </IconTip>
              <IconTip label="Delete priority">
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-danger hover:text-danger-600"
                  aria-label="Delete priority"
                  onPress={() => handleDelete(r.priority)}
                  icon={<Icon name="trash" className="h-4 w-4" />}
                />
              </IconTip>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 80,
      }),
    ],
    [handleEdit, handleDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  return (
    <ListPage
      title="Custom Priorities"
      breadcrumbsKey="configuration.custom-priorities.list"
      table={table}
      isLoading={isLoading}
      actions={
        <BaseButton
          color="primary"
          onPress={handleCreate}
          icon={<Icon name="plus" className="h-4 w-4" />}
        >
          Add Priority
        </BaseButton>
      }
      subheader={
        <PageHint>
          Every ticket can be given one of the built-in priorities: Critical,
          High, Normal or Low. Add your own to match how your team works, such
          as Urgent or VIP.
        </PageHint>
      }
      modals={
        <>
          <CustomPriorityEditorModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            priority={editing}
            existingNames={rows.map(r => r.name)}
          />
          {dialog}
        </>
      }
    />
  );
}

export default CustomPrioritiesPage;
