import { type ColumnDef } from '@tanstack/react-table';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { ApprovalMode, type ApprovalWorkflowListDto } from '@/types/approval';

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
          <div className="text-xs text-gray-500 mt-0.5">{row.original.description}</div>
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
      <Chip size="sm" variant="flat" color="primary">
        {APPROVAL_MODE_LABELS[row.original.approvalMode]}
      </Chip>
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
      <Chip
        size="sm"
        variant="flat"
        color={row.original.isActive ? 'success' : 'default'}
      >
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Chip>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <BaseButton
          size="sm"
          variant="light"
          onPress={() => onEdit(row.original.id)}
          icon={<Icon name="pencil" className="h-3.5 w-3.5" />}
        >
          Edit
        </BaseButton>
        <Dropdown>
          <DropdownTrigger>
            <BaseButton
              size="sm"
              variant="light"
              icon={<Icon name="ellipsis-vertical" className="h-3.5 w-3.5" />}
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="Workflow actions">
            <DropdownItem
              key="delete"
              className="text-danger"
              color="danger"
              onPress={() => onDelete(row.original.id)}
            >
              Delete
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    ),
  },
];
