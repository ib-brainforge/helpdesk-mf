import { IconTip, StatusBadge } from '@/components/shared';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';
import { BaseInput, BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { toast } from '@heroui/react';
import { useMemo, useState } from 'react';

import { useDuplicateCategory } from '@/components/categories/hooks/useCategoriesData';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
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

type CategoryRow = CategoryDto & { sectionName?: string };

const columnHelper = createColumnHelper<CategoryRow>();

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  sections,
  isLoading,
  onEditCategory,
  onDeleteCategory,
  onEditSection,
  onDeleteSection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const duplicateCategoryMutation = useDuplicateCategory();

  const handleDuplicate = (category: CategoryDto) => {
    duplicateCategoryMutation.mutate(category.id, {
      onSuccess: () => {
        toast('Category duplicated', {
          description: `"${category.name} (copy)" has been created.`,
          variant: 'success',
        });
      },
      onError: () => {
        toast('Duplication failed', {
          description: 'Could not duplicate the category. Please try again.',
          variant: 'danger',
        });
      },
    });
  };

  const columns = useMemo(
    (): ColumnDef<CategoryRow, any>[] => [
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onEditCategory(row.original)}
            className="text-primary hover:underline font-medium"
          >
            {row.original.name}
          </button>
        ),
        size: 300,
      }),
      columnHelper.display({
        id: 'accessLevel',
        header: 'Access Type',
        cell: ({ row }) => (
          <StatusBadge
            color={getAccessLevelColor(row.original.accessLevel as AccessLevel)}
          >
            {getAccessLevelName(row.original.accessLevel as AccessLevel)}
          </StatusBadge>
        ),
        size: 150,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="-my-1.5 flex items-center justify-end gap-1">
            <IconTip label={'Duplicate category'}>
              <BaseButton
                variant="link"
                size="none"
                className="text-dark dark:text-light hover:text-blue"
                aria-label="Duplicate category"
                onPress={() => handleDuplicate(row.original)}
                icon={<Icon name="document-duplicate" className="h-4 w-4" />}
              />
            </IconTip>
            <IconTip label={'Edit category'}>
              <BaseButton
                variant="link"
                size="none"
                className="text-dark dark:text-light hover:text-blue"
                aria-label="Edit category"
                onPress={() => onEditCategory(row.original)}
                icon={<Icon name="pencil" className="h-4 w-4" />}
              />
            </IconTip>
            <IconTip label={'Delete category'}>
              <BaseButton
                variant="link"
                size="none"
                className="text-danger hover:text-danger-600"
                aria-label="Delete category"
                onPress={() => onDeleteCategory(row.original.id)}
                icon={<Icon name="trash" className="h-4 w-4" />}
              />
            </IconTip>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 100,
      }),
    ],
    [onEditCategory, onDeleteCategory],
  );

  // Build flat rows with section grouping info
  const rows = useMemo(() => {
    const result: CategoryRow[] = [];
    const categoriesBySection = new Map<string | undefined, CategoryDto[]>();

    categories.forEach(cat => {
      const sectionId = cat.sectionId;
      if (!categoriesBySection.has(sectionId)) {
        categoriesBySection.set(sectionId, []);
      }
      categoriesBySection.get(sectionId)!.push(cat);
    });

    // Sectioned categories
    sections.forEach(section => {
      const sectionCats = categoriesBySection.get(section.id) || [];
      sectionCats.forEach(cat => {
        result.push({ ...cat, sectionName: section.name });
      });
    });

    // Unsectioned categories
    const unsectioned = categoriesBySection.get(undefined) || [];
    unsectioned.forEach(cat => {
      result.push({ ...cat, sectionName: undefined });
    });

    return result;
  }, [categories, sections]);

  // Filter by search
  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    return rows.filter(row =>
      row.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [rows, searchTerm]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-default-500">Loading categories...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <BaseInput
          placeholder="Search categories..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          startContent={
            <Icon
              name="magnifying-glass"
              className="h-4 w-4 text-default-400"
            />
          }
          className="max-w-md"
        />
      </div>

      <BaseTable
        table={table}
        showInfo={false}
        isLoading={isLoading}
        loading={{ title: 'Loading categories...' }}
      />
    </div>
  );
};
