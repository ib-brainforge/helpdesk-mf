import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { Chip } from '@heroui/react';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';

interface CategoryListProps {
  categories: CategoryDto[];
  sections: SectionDto[];
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
  onEditCategory,
  onDeleteCategory,
  onEditSection,
  onDeleteSection,
}) => {
  // Group categories by section
  const categoriesBySection = categories.reduce((acc, category) => {
    const sectionId = category.sectionId || 'unsectioned';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(category);
    return acc;
  }, {} as Record<string, CategoryDto[]>);

  // REVIEW: Sort sections by sortOrder
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Unsectioned categories */}
      {categoriesBySection['unsectioned'] && categoriesBySection['unsectioned'].length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-default-500 mb-3">Unsectioned</h3>
          <div className="space-y-2">
            {categoriesBySection['unsectioned'].map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-content1 rounded-lg border border-divider"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <Chip
                      color={getAccessLevelColor(category.accessLevel)}
                      variant="flat"
                      size="sm"
                    >
                      {getAccessLevelName(category.accessLevel)}
                    </Chip>
                    {!category.isActive && (
                      <Chip color="default" variant="flat" size="sm">
                        Inactive
                      </Chip>
                    )}
                  </div>
                  {category.emailRoutingAddress && (
                    <div className="text-xs text-default-500 mt-1">
                      {category.emailRoutingAddress}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <BaseButton
                    variant="link"
                    size="none"
                    className="text-foreground hover:text-blue"
                    aria-label="Edit category"
                    onPress={() => onEditCategory(category)}
                    icon={<Icon name="pencil" className="h-4 w-4" />}
                  />
                  <BaseButton
                    variant="link"
                    size="none"
                    className="text-danger hover:text-danger-600"
                    aria-label="Delete category"
                    onPress={() => onDeleteCategory(category.id)}
                    icon={<Icon name="trash" className="h-4 w-4" />}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sectioned categories */}
      {sortedSections.map((section) => {
        const sectionCategories = categoriesBySection[section.id] || [];
        if (sectionCategories.length === 0 && section.isActive) return null;

        return (
          <div key={section.id}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{section.name}</h3>
                {!section.isActive && (
                  <Chip color="default" variant="flat" size="sm">
                    Inactive
                  </Chip>
                )}
              </div>
              <div className="flex items-center gap-1">
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-foreground hover:text-blue"
                  aria-label="Edit section"
                  onPress={() => onEditSection(section)}
                  icon={<Icon name="pencil" className="h-4 w-4" />}
                />
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-danger hover:text-danger-600"
                  aria-label="Delete section"
                  onPress={() => onDeleteSection(section.id)}
                  icon={<Icon name="trash" className="h-4 w-4" />}
                />
              </div>
            </div>
            <div className="space-y-2 ml-4">
              {sectionCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-content1 rounded-lg border border-divider"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      <Chip
                        color={getAccessLevelColor(category.accessLevel)}
                        variant="flat"
                        size="sm"
                      >
                        {getAccessLevelName(category.accessLevel)}
                      </Chip>
                      {!category.isActive && (
                        <Chip color="default" variant="flat" size="sm">
                          Inactive
                        </Chip>
                      )}
                    </div>
                    {category.emailRoutingAddress && (
                      <div className="text-xs text-default-500 mt-1">
                        {category.emailRoutingAddress}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <BaseButton
                      variant="link"
                      size="none"
                      className="text-foreground hover:text-blue"
                      aria-label="Edit category"
                      onPress={() => onEditCategory(category)}
                      icon={<Icon name="pencil" className="h-4 w-4" />}
                    />
                    <BaseButton
                      variant="link"
                      size="none"
                      className="text-danger hover:text-danger-600"
                      aria-label="Delete category"
                      onPress={() => onDeleteCategory(category.id)}
                      icon={<Icon name="trash" className="h-4 w-4" />}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
