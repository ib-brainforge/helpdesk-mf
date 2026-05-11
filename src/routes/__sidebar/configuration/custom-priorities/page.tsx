import { BaseButton, BaseInput, Icon } from '@brainforgeau/components';
import { EmptyState, ListPage } from '@brainforgeau/components/page';
import { withAuthorizationRequired } from '@brainforgeau/security';
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
}

const EMPTY_COLUMNS: ColumnDef<CustomPriority, any>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => <span>{row.original.name}</span>,
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

  const columns = useMemo(() => EMPTY_COLUMNS, []);

  // REVIEW: Replace with real data hook when backend is ready
  const table = useReactTable<CustomPriority>({
    data: [],
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
        <div className="max-w-2xl p-4 bg-default-50 rounded-lg border border-default-200">
          <p className="text-sm text-default-700 mb-4">
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
        </div>
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

export default withAuthorizationRequired(CustomPrioritiesPage, {
  requiredPermissions: ['Helpdesk.Settings.Manage'],
});
