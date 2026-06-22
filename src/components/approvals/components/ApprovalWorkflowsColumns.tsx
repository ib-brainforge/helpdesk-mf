import { StatusBadge } from '@/components/shared';
import { ApprovalMode, type ApprovalWorkflowListDto } from '@/types/approval';
import { BaseButton, Icon } from '@brainforgeau/components';
import type { ColumnDef } from '@tanstack/react-table';

// REVIEW: Following existing pattern from AutomationRulesColumns

export const APPROVAL_MODE_LABELS: Record<ApprovalMode, string> = {
  [ApprovalMode.Sequential]: 'Sequential',
  [ApprovalMode.Parallel]: 'Parallel',
  [ApprovalMode.AnyOne]: 'Any One',
};

interface CreateColumnsParams {
  onEdit: (workflowId: string) => void;
  onDelete: (workflowId: string) => void;
}

export const createApprovalWorkflowsColumns = ({
  onEdit,
  onDelete,
}: CreateColumnsParams): ColumnDef<ApprovalWorkflowListDto>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        {row.original.description && (
          <div className="text-xs text-default-500 mt-0.5">
            {row.original.description}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'categoryName',
    header: 'Category',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.categoryName || 'Global'}</span>
    ),
  },
  {
    accessorKey: 'approvalMode',
    header: 'Mode',
    cell: ({ row }) => (
      <StatusBadge color="primary">
        {APPROVAL_MODE_LABELS[row.original.approvalMode]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: 'stepsCount',
    header: 'Steps',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.stepsCount}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge color={row.original.isActive ? 'success' : 'default'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </StatusBadge>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="-my-1.5 flex items-center justify-end gap-1">
        <BaseButton
          variant="link"
          size="none"
          className="text-dark dark:text-light hover:text-blue"
          aria-label="Edit approval workflow"
          onPress={() => onEdit(row.original.id)}
          icon={<Icon name="pencil" className="h-4 w-4" />}
        />
        <BaseButton
          variant="link"
          size="none"
          className="text-danger hover:text-danger-600"
          aria-label="Delete approval workflow"
          onPress={() => onDelete(row.original.id)}
          icon={<Icon name="trash" className="h-4 w-4" />}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 80,
  },
];
