import { useMemo, useState } from 'react';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseInput } from '@brainforgeau/components';
import { StatusBadge } from '@/components/shared';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';
import { addToast } from '@heroui/react';

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
  const [searchTerm, setSearchTerm] = useState('');

  // Group categories by section
  const categoriesBySection = useMemo(() => {
    const grouped = new Map<string | undefined, CategoryDto[]>();

    categories.forEach((category) => {
      const sectionId = category.sectionId;
      if (!grouped.has(sectionId)) {
        grouped.set(sectionId, []);
      }
      grouped.get(sectionId)!.push(category);
    });

    return grouped;
  }, [categories]);

  const handleTagsClick = () => {
    addToast({
      title: 'Coming soon',
      description: 'Tag filtering will be available soon',
      severity: 'warning',
    });
  };

  const handleMoreFilters = () => {
    addToast({
      title: 'Coming soon',
      description: 'Advanced filters will be available soon',
      severity: 'warning',
    });
  };

  const handleDuplicate = (category: CategoryDto) => {
    addToast({
      title: 'Coming soon',
      description: 'Category duplication will be available soon',
      severity: 'warning',
    });
  };

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
          onChange={(e) => setSearchTerm(e.target.value)}
          startContent={<Icon name="magnifying-glass" className="h-4 w-4 text-default-400" />}
          className="max-w-md"
        />
        <BaseButton
          variant="bordered"
          onPress={handleTagsClick}
          icon={<Icon name="tag" className="h-4 w-4" />}
        >
          Tags
        </BaseButton>
        <BaseButton
          variant="bordered"
          onPress={handleMoreFilters}
          icon={<Icon name="adjustments-horizontal" className="h-4 w-4" />}
        >
          More filters
        </BaseButton>
      </div>

      {/* Tree Layout Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-default-100 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold">Name</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Access Type</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const sectionCategories = categoriesBySection.get(section.id) || [];
              const filteredCategories = searchTerm
                ? sectionCategories.filter((cat) =>
                    cat.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                : sectionCategories;

              if (searchTerm && filteredCategories.length === 0) {
                return null;
              }

              return (
                <>
                  {/* Section Row */}
                  <tr key={`section-${section.id}`} className="bg-default-50 border-b">
                    <td className="px-4 py-3" colSpan={3}>
                      <div className="flex items-center gap-2">
                        <Icon name="folder" className="h-4 w-4 text-default-400" />
                        <span className="font-semibold text-default-700">{section.name}</span>
                      </div>
                    </td>
                  </tr>
                  {/* Category Rows */}
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="border-b hover:bg-default-50 transition-colors">
                      <td className="px-4 py-3 pl-10">
                        <button
                          type="button"
                          onClick={() => onEditCategory(category)}
                          className="text-primary hover:underline font-medium"
                        >
                          {category.name}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge color={getAccessLevelColor(category.accessLevel as AccessLevel)}>
                          {getAccessLevelName(category.accessLevel as AccessLevel)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDuplicate(category)}
                            className="p-1 hover:bg-default-100 rounded"
                            title="Duplicate"
                          >
                            <Icon name="document-duplicate" className="h-4 w-4 text-default-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCategory(category.id)}
                            className="p-1 hover:bg-danger-50 rounded"
                            title="Delete"
                          >
                            <Icon name="trash" className="h-4 w-4 text-danger" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
            {/* Categories without section */}
            {(() => {
              const unsectionedCategories = categoriesBySection.get(undefined) || [];
              const filteredUnsectioned = searchTerm
                ? unsectionedCategories.filter((cat) =>
                    cat.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                : unsectionedCategories;

              return filteredUnsectioned.map((category) => (
                <tr key={category.id} className="border-b hover:bg-default-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onEditCategory(category)}
                      className="text-primary hover:underline font-medium"
                    >
                      {category.name}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge color={getAccessLevelColor(category.accessLevel as AccessLevel)}>
                      {getAccessLevelName(category.accessLevel as AccessLevel)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(category)}
                        className="p-1 hover:bg-default-100 rounded"
                        title="Duplicate"
                      >
                        <Icon name="document-duplicate" className="h-4 w-4 text-default-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(category.id)}
                        className="p-1 hover:bg-danger-50 rounded"
                        title="Delete"
                      >
                        <Icon name="trash" className="h-4 w-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};
