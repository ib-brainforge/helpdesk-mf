import { useState, useMemo } from 'react';
import { Icon } from '@brainforgeau/components/base';
import { Chip, Spinner } from '@heroui/react';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useTags } from '@/components/tags/hooks/useTags';
import type { CategoryDto, SectionDto } from '@/types/category';

type Category = {
  id: string;
  name: string;
  children?: Category[];
};

type TicketSidebarProps = {
  onCategorySelect?: (categoryId: string | null) => void;
  onTagSelect?: (tagId: string) => void;
  selectedTags?: string[];
};

function CategoryTree({
  categories,
  onSelect,
  level = 0,
}: {
  categories: Category[];
  onSelect: (id: string | null) => void;
  level?: number;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1', '2', '3']));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {categories.map((category) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedIds.has(category.id);

        return (
          <div key={category.id}>
            <button
              type="button"
              onClick={() => {
                if (hasChildren) {
                  toggleExpand(category.id);
                } else {
                  onSelect(category.id);
                }
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-default-100 transition-colors"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
              {hasChildren && (
                <Icon
                  name={isExpanded ? 'chevron-down' : 'chevron-right'}
                  className="h-3 w-3 flex-shrink-0 text-default-400"
                />
              )}
              <Icon name="folder" className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate">{category.name}</span>
            </button>
            {hasChildren && isExpanded && (
              <CategoryTree categories={category.children!} onSelect={onSelect} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TicketSidebar({ onCategorySelect, onTagSelect, selectedTags = [] }: TicketSidebarProps) {
  const { categories, sections, isLoading: isLoadingCategories } = useCategoriesData();
  const { tags, isLoading: isLoadingTags } = useTags();

  // Group categories by section to build hierarchy
  const categoryTree: Category[] = useMemo(() => {
    const tree: Category[] = [];

    // Sort sections by sortOrder
    const sortedSections = [...sections].sort((a: SectionDto, b: SectionDto) => a.sortOrder - b.sortOrder);

    for (const section of sortedSections) {
      if (!section.isActive) continue;

      const sectionCategories = categories
        .filter((cat: CategoryDto) => cat.sectionId === section.id && cat.isActive)
        .sort((a: CategoryDto, b: CategoryDto) => a.sortOrder - b.sortOrder)
        .map((cat: CategoryDto) => ({
          id: cat.id,
          name: cat.name,
        }));

      if (sectionCategories.length > 0) {
        tree.push({
          id: section.id,
          name: section.name,
          children: sectionCategories,
        });
      }
    }

    // Add categories without sections
    const orphanCategories = categories
      .filter((cat: CategoryDto) => !cat.sectionId && cat.isActive)
      .sort((a: CategoryDto, b: CategoryDto) => a.sortOrder - b.sortOrder)
      .map((cat: CategoryDto) => ({
        id: cat.id,
        name: cat.name,
      }));

    tree.push(...orphanCategories);

    return tree;
  }, [categories, sections]);

  return (
    <div className="flex h-full w-64 flex-col border-r border-default-200 bg-default-50 p-4">
      {/* Categories Section */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-default-700">Categories</h3>
          <button
            type="button"
            onClick={() => onCategorySelect?.(null)}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        </div>
        {isLoadingCategories ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : (
          <CategoryTree categories={categoryTree} onSelect={onCategorySelect || (() => {})} />
        )}
      </div>

      {/* Tags Section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-default-700">Tags</h3>
        {isLoadingTags ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 10).map((tag) => (
              <Chip
                key={tag.id}
                size="sm"
                variant={selectedTags.includes(tag.id!) ? 'solid' : 'bordered'}
                color={selectedTags.includes(tag.id!) ? 'primary' : 'default'}
                className="cursor-pointer"
                onClick={() => onTagSelect?.(tag.id!)}
                style={
                  tag.color
                    ? {
                        backgroundColor: selectedTags.includes(tag.id!)
                          ? tag.color
                          : 'transparent',
                        borderColor: tag.color,
                        color: selectedTags.includes(tag.id!) ? '#fff' : tag.color,
                      }
                    : undefined
                }
              >
                {tag.name}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
