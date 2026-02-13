import { BaseButton, Icon } from '@brainforgeau/components';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import type { CustomFieldsRow } from '../types';
import { StatusBadge } from '@/components/shared';
import { CustomFieldType, CustomFieldUsageType } from '@/types/custom-field';

const columnHelper = createColumnHelper<CustomFieldsRow>();

interface CreateColumnsOptions {
  onEdit?: (fieldId: string) => void;
  onDelete?: (fieldId: string) => void;
}

// REVIEW: Helper function to get field type display name
const getFieldTypeDisplayName = (type: CustomFieldType): string => {
  const typeMap: Record<CustomFieldType, string> = {
    [CustomFieldType.Text]: 'Text',
    [CustomFieldType.Date]: 'Date',
    [CustomFieldType.Dropdown]: 'Dropdown',
    [CustomFieldType.Checkbox]: 'Checkbox',
    [CustomFieldType.MultilineText]: 'Multiline Text',
    [CustomFieldType.Url]: 'URL',
    [CustomFieldType.Number]: 'Number',
    [CustomFieldType.Email]: 'Email',
    [CustomFieldType.MultiSelect]: 'Multi-Select',
  };
  return typeMap[type] || 'Unknown';
};

// REVIEW: Helper function to get usage type display name
const getUsageTypeDisplayName = (type: CustomFieldUsageType): string => {
  const typeMap: Record<CustomFieldUsageType, string> = {
    [CustomFieldUsageType.Ticket]: 'Ticket',
  };
  return typeMap[type] || 'Unknown';
};

export const createCustomFieldsColumns = (options: CreateColumnsOptions): ColumnDef<CustomFieldsRow, any>[] => [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    size: 200,
  }),
  columnHelper.accessor('fieldType', {
    header: 'Type',
    cell: ({ getValue }) => {
      const type = getValue();
      return (
        <StatusBadge color="primary">
          {getFieldTypeDisplayName(type)}
        </StatusBadge>
      );
    },
    size: 140,
  }),
  columnHelper.accessor('usageType', {
    header: 'Usage',
    cell: ({ getValue }) => {
      const type = getValue();
      return (
        <StatusBadge
          color={type === CustomFieldUsageType.Ticket ? 'secondary' : 'default'}        >
          {getUsageTypeDisplayName(type)}
        </StatusBadge>
      );
    },
    size: 100,
  }),
  columnHelper.accessor('isRequired', {
    header: 'Required',
    cell: ({ getValue }) => {
      const isRequired = getValue();
      return (
        <StatusBadge
          color={isRequired ? 'warning' : 'default'}        >
          {isRequired ? 'Yes' : 'No'}
        </StatusBadge>
      );
    },
    size: 100,
  }),
  columnHelper.accessor('isActive', {
    header: 'Status',
    cell: ({ getValue }) => {
      const isActive = getValue();
      return (
        <StatusBadge
          color={isActive ? 'success' : 'default'}        >
          {isActive ? 'Active' : 'Inactive'}
        </StatusBadge>
      );
    },
    size: 100,
  }),
  columnHelper.display({
    id: 'options',
    header: 'Options',
    cell: ({ row }) => {
      const field = row.original;
      const hasOptions = field.options && field.options.length > 0;
      return hasOptions ? (
        <span className="text-sm text-default-500">{field.options?.length} options</span>
      ) : (
        <span className="text-default-400">—</span>
      );
    },
    size: 100,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <BaseButton
          variant="link"
          size="none"
          className="text-foreground hover:text-blue"
          aria-label="Edit field"
          onPress={() => row.original.id && options?.onEdit?.(row.original.id)}
          icon={<Icon name="pencil" className="h-4 w-4" />}
        />
        <BaseButton
          variant="link"
          size="none"
          className="text-danger hover:text-danger-600"
          aria-label="Delete field"
          onPress={() => row.original.id && options?.onDelete?.(row.original.id)}
          icon={<Icon name="trash" className="h-4 w-4" />}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 80,
  }),
];
