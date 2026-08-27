import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useTags } from '@/components/tags/hooks/useTags';
import type { CategoryDto, SectionDto } from '@/types/category';
import { Icon } from '@brainforgeau/components/base';
import { Chip, Spinner } from '@heroui/react';
import { useMemo, useState } from 'react';

type Category = {
  id: string;
  name: string;
  children?: Category[];
};

type TicketSidebarProps = {
  onCategorySelect?: (categoryId: string | null) => void;
  onTagSelect?: (tagId: string) => void;
  selectedTags?: string[];
  /** Drives the highlighted row; null/undefined means "All categories". */
  selectedCategoryId?: string | null;
  /** Called when user wants to close the sidebar (mobile drawer close button) */
  onClose?: () => void;
};

function CategoryTree({
  categories,
  onSelect,
  selectedId,
  level = 0,
}: {
  categories: Category[];
  onSelect: (id: string | null) => void;
  selectedId?: string | null;
  level?: number;
}) {
  // Collapsed by default: top-level sections stay scannable as a short list and
  // the panel does not open onto a wall of nested rows. (The previous hardcoded
  // seed of ('1','2','3') matched no real id, so this is now explicit rather
  // than collapsed by accident.)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
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
      {categories.map(category => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedIds.has(category.id);

        const isSelected = selectedId === category.id;

        return (
          <div key={category.id}>
            {/*
              A node with children is a SECTION, not a category. The tree's top
              level is built from `sections` (see categoryTree below), whose ids
              are section ids — passing one as `categoryId` filters on an id no
              ticket can ever carry, so it always came back empty. A section is
              the box the categories sit in, so its row is a disclosure and
              nothing else.

              Leaf nodes are real categories and stay filterable.
            */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(category.id)}
                aria-expanded={isExpanded}
                title={category.name}
                className="hover:bg-default-100 group flex w-full items-center rounded-md transition-colors"
                style={{ marginLeft: `${level * 12}px` }}
              >
                <span className="flex h-7 w-5 flex-shrink-0 items-center justify-center">
                  {/*
                    The icon set ships only chevron-left/right — there is no
                    `chevron-up`, so naming one rendered nothing at all and the
                    collapse affordance was simply invisible. Rotating the
                    right-chevron gives the arrow AND animates between states:
                    -90deg points it up (the action the click performs:
                    collapse), 0deg leaves it pointing right, which reads as
                    "opens to reveal children".
                  */}
                  <Icon
                    name="chevron-right"
                    className={`text-default-400 h-3 w-3 transition-transform duration-150 ${
                      isExpanded ? '-rotate-90' : ''
                    }`}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-sm font-semibold">
                  {category.name}
                </span>
              </button>
            ) : (
              <div
                className={`group flex items-center rounded-md transition-colors ${
                  isSelected
                    ? 'bg-lighter-blue text-blue'
                    : 'hover:bg-default-100'
                }`}
                style={{ marginLeft: `${level * 12}px` }}
              >
                {/* Keeps labels aligned with the sections above them, so the
                    list reads as one column instead of a ragged edge. */}
                <span className="w-5 flex-shrink-0" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => onSelect(category.id)}
                  aria-pressed={isSelected}
                  title={category.name}
                  className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-sm ${
                    isSelected ? 'font-medium' : ''
                  }`}
                >
                  {category.name}
                </button>
              </div>
            )}

            {hasChildren && isExpanded && (
              <CategoryTree
                categories={category.children!}
                onSelect={onSelect}
                selectedId={selectedId}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TicketSidebar({
  onCategorySelect,
  onTagSelect,
  selectedTags = [],
  selectedCategoryId = null,
  onClose,
}: TicketSidebarProps) {
  const {
    categories,
    sections,
    isLoading: isLoadingCategories,
  } = useCategoriesData();
  const { tags, isLoading: isLoadingTags } = useTags();

  // Group categories by section to build hierarchy
  const categoryTree: Category[] = useMemo(() => {
    const tree: Category[] = [];

    // Sort sections by sortOrder
    const sortedSections = [...sections].sort(
      (a: SectionDto, b: SectionDto) => a.sortOrder - b.sortOrder,
    );

    for (const section of sortedSections) {
      if (!section.isActive) continue;

      const sectionCategories = categories
        .filter(
          (cat: CategoryDto) => cat.sectionId === section.id && cat.isActive,
        )
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
    // min-h-0 + overflow-hidden confine scrolling to the scroll region below.
    // Without min-h-0 this flex child refuses to shrink below its content, so
    // the overflow escapes upward and the whole page scrolls instead.
    // Vertical padding only. The horizontal padding moves onto the children so
    // the scroll container spans the full panel width and its scrollbar sits
    // against the border instead of floating 16px inside it.
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden py-4">
      {/* Mobile close button — only visible when onClose is provided (inside drawer) */}
      {onClose && (
        <div className="mb-3 flex items-center justify-between px-4">
          <span className="text-sm font-semibold text-default-700">Filter</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter sidebar"
            className="flex items-center justify-center rounded-md p-1 hover:bg-default-100 transition-colors"
          >
            <Icon name="XMarkIcon" className="h-5 w-5 text-default-500" />
          </button>
        </div>
      )}

      {/* Scroll region: Categories + Tags scroll together INSIDE the panel, so a
          long category list never pushes the page itself into a scrollbar. The
          mobile close button above stays pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {/* Categories Section */}
        <div className="mb-6">
          {/*
          "All categories" replaces the old static heading + separate "Clear"
          link. It does the same job as Clear, but as the first row of the list
          it reads as part of the filter rather than a disconnected action, and
          it shows the unfiltered state as a real selection instead of leaving
          nothing highlighted.
        */}
          <button
            type="button"
            onClick={() => onCategorySelect?.(null)}
            aria-pressed={!selectedCategoryId}
            className={`mb-1 flex w-full items-center rounded-md py-1.5 pr-2 text-left text-sm transition-colors ${
              selectedCategoryId
                ? 'text-default-700 hover:bg-default-100'
                : 'bg-lighter-blue text-blue font-medium'
            }`}
          >
            <span className="w-5 flex-shrink-0" aria-hidden="true" />
            All categories
          </button>

          {isLoadingCategories ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <CategoryTree
              categories={categoryTree}
              onSelect={onCategorySelect || (() => {})}
              selectedId={selectedCategoryId}
            />
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
              {/*
              Tags now use the app's primary blue instead of each tag's stored
              `tag.color`. Those per-tag colours are arbitrary (the seed data
              renders them red/orange), which made a filter control look like a
              row of warnings and pulled attention away from the ticket list.
              Selected reads as a solid blue chip, unselected as a quiet
              outline, so selection is obvious at a glance.

              tag.color is untouched in the data — this only changes how the
              filter chips render.
            */}
              {tags.slice(0, 10).map(tag => {
                const isSelected = selectedTags.includes(tag.id!);
                return (
                  <Chip
                    key={tag.id}
                    size="sm"
                    // variant/color pinned to a neutral outline for both states so
                    // the component does not inject its own palette; the exact
                    // colours come from the className below.
                    variant="tertiary"
                    color="default"
                    aria-pressed={isSelected}
                    // `blue` is the theme's --color-blue (#1868db) — the same blue
                    // as the New Ticket button. The earlier attempt used `primary`,
                    // which maps to a different token and rendered off-colour.
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue border-blue text-white'
                        : 'border-light-blue text-blue hover:bg-lighter-blue bg-transparent'
                    }`}
                    onClick={() => onTagSelect?.(tag.id!)}
                  >
                    {tag.name}
                  </Chip>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
