import { PresetPill, StatusBadge } from '@/components/shared';
import { getPriorityConfig } from '@/components/tickets/ticket-priority-config';
import { TicketPriority } from '@/types/ticket';
import {
  BaseButton,
  BaseCard,
  BaseInput,
  Icon,
} from '@brainforgeau/components';
import { EmptyState, ListPage } from '@brainforgeau/components/page';
import { toast } from '@heroui/react';
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

// REVIEW: Custom priorities API is not yet implemented. This page is a placeholder
// that will be wired to a real endpoint when the backend is ready.

interface CustomPriority {
  id: string;
  name: string;
  /** Set on the built-in priorities, which are listed but read only. */
  preset?: TicketPriority;
  meaning?: string;
}

/*
 * The built-in priorities every ticket uses, highest first. Custom priorities
 * have no backend yet, so these are the whole set; listing them shows what a
 * ticket can actually be given instead of an empty table.
 */
const PRESET_PRIORITIES: CustomPriority[] = [
  {
    preset: TicketPriority.Critical,
    meaning: 'Drop everything',
  },
  { preset: TicketPriority.High, meaning: 'Wants attention soon' },
  { preset: TicketPriority.Normal, meaning: 'The expected case' },
  { preset: TicketPriority.Low, meaning: 'No urgency' },
].map(p => ({
  ...p,
  id: `preset-priority-${p.preset}`,
  name: getPriorityConfig(p.preset).label,
}));

const COLUMNS: ColumnDef<CustomPriority, any>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) =>
      row.original.preset ? (
        <StatusBadge color={getPriorityConfig(row.original.preset).color}>
          {row.original.name}
        </StatusBadge>
      ) : (
        <span>{row.original.name}</span>
      ),
  },
  {
    id: 'meaning',
    header: 'Meaning',
    cell: ({ row }) => (
      <span className="text-default-600 text-sm">
        {row.original.meaning ?? ''}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      row.original.preset ? (
        <div className="-my-1.5 flex items-center justify-end">
          <PresetPill hint="Built into Helpdesk. It can't be edited or deleted." />
        </div>
      ) : null,
    size: 80,
  },
];

function CustomPrioritiesPage() {
  const [priorityName, setPriorityName] = useState('');

  const handleAdd = () => {
    if (!priorityName.trim()) {
      toast('Validation error', {
        description: 'Please enter a priority name',
        variant: 'warning',
      });
      return;
    }

    toast('Backend not available', {
      description: 'Custom priorities API is not yet implemented',
      variant: 'warning',
    });
    setPriorityName('');
  };

  const columns = useMemo(() => COLUMNS, []);

  // REVIEW: Append the tenant's own priorities here once the backend exists.
  const table = useReactTable<CustomPriority>({
    data: PRESET_PRIORITIES,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <ListPage
      title="Custom Priorities"
      breadcrumbsKey="configuration.custom-priorities.list"
      table={table}
      isLoading={false}
      subheader={
        <BaseCard className="max-w-2xl">
          <p className="text-default-700 mb-4 text-sm">
            Custom priorities allow you to define specific priority levels
            beyond the default options (Critical, High, Normal, Low). Use this
            to match your organization's workflow.
          </p>
          <div className="flex items-end gap-3">
            <BaseInput
              label="Priority Name"
              placeholder="Enter priority name..."
              value={priorityName}
              onChange={e => setPriorityName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAdd();
                }
              }}
              className="flex-1"
            />
            <BaseButton
              color="primary"
              onPress={handleAdd}
              icon={<Icon name="plus" className="h-4 w-4" />}
            >
              Add
            </BaseButton>
          </div>
        </BaseCard>
      }
      empty={
        <EmptyState
          title="No custom priorities yet"
          description="Add your first custom priority using the form above."
          size="sm"
        />
      }
    />
  );
}

export default CustomPrioritiesPage;
