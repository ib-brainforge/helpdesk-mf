import { useMemo } from 'react';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseTable } from '@brainforgeau/components';
import { StatusBadge } from '@/components/shared';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table';

interface CategoryListProps {
  categories: CategoryDto[];
  sections: SectionDto[];
  isLoading?: boolean;
  onEditCategory: (category: CategoryDto) => void;
  onDeleteCategory: (categoryId: string) => void;
  onEditSection: (section: SectionDto) => void;
  onDeleteSection: (sectionId: string) => void;
}

const getAccessLevelColor = (level: AccessLevel) => {
  const colors: Record<AccessLevel, 'default' | 'primary' | 'warning'> = {
    [AccessLevel.Everyone]: 'default',
    [AccessLevel.AgentsOnly]: 'primary',
    [AccessLevel.AdminsOnly]: 'warning',
  };
  return colors[level] || 'default';
};

const getAccessLevelName = (level: AccessLevel): string => {
  const names: Record<AccessLevel, string> = {
    [AccessLevel.Everyone]: 'Everyone',
    [AccessLevel.AgentsOnly]: 'Agents Only',
    [AccessLevel.AdminsOnly]: 'Admins Only',
  };
  return names[level] || 'Unknown';
};

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  sections,
  isLoading,
  onEditCategory,
  onDeleteCategory,
  onEditSection,
  onDeleteSection,
}) => {
  const columns: ColumnDef<CategoryDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'sectionName',
        header: 'Section',
        cell: (info) => (info.getValue() as string) || <span className="text-default-400">—</span>,
      },
      {
        accessorKey: 'accessLevel',
        header: 'Access',
        cell: (info) => {
          const level = info.getValue() as AccessLevel;
          return (
            <StatusBadge color={getAccessLevelColor(level)}>
              {getAccessLevelName(level)}
            </StatusBadge>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: (info) => (
          <StatusBadge color={info.getValue() ? 'success' : 'default'}>
            {info.getValue() ? 'Active' : 'Inactive'}
          </StatusBadge>
        ),
      },
      {
        accessorKey: 'emailRoutingAddress',
        header: 'Email Routing',
        cell: (info) => (info.getValue() as string) || <span className="text-default-400">—</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <BaseButton
              variant="link"
              size="none"
              className="text-foreground hover:text-blue"
              aria-label="Edit category"
              onPress={() => onEditCategory(row.original)}
              icon={<Icon name="pencil" className="h-4 w-4" />}
            />
            <BaseButton
              variant="link"
              size="none"
              className="text-danger hover:text-danger-600"
              aria-label="Delete category"
              onPress={() => onDeleteCategory(row.original.id)}
              icon={<Icon name="trash" className="h-4 w-4" />}
            />
          </div>
        ),
      },
    ],
    [onEditCategory, onDeleteCategory],
  );

  const table = useReactTable({
    data: categories,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <BaseTable
      table={table}
      isLoading={isLoading}
      loading={{ title: 'Loading categories...' }}
      fullHeight
    />
  );
};
