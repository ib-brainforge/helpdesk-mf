import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { usePresetCategories } from '@/components/categories/hooks/usePresetCategories';
import { IconTip } from '@/components/shared';
import type { CategoryDto, SectionDto } from '@/types/category';
import type { TicketFilters } from '@/types/ticket';
import { Icon } from '@brainforgeau/components/base';
import { Spinner } from '@heroui/react';
import { useMemo, useState } from 'react';
import { AssigneeFilterList } from './components/AssigneeFilterList';

export type Category = {
  id: string;
  name: string;
  children?: Category[];
};

type TicketSidebarProps = {
  onCategorySelect?: (categoryId: string | null) => void;
  /** Currently filtered assignee, or undefined for everyone. */
  selectedAssigneeId?: string;
  onAssigneeSelect?: (assigneeId?: string) => void;
  /** Active filters, so each assignee's count matches the grid for that person. */
  ticketFilters?: TicketFilters;
  /** Drives the highlighted row; null/undefined means "All categories". */
  selectedCategoryId?: string | null;
  /** Called when user wants to close the sidebar (mobile drawer close button) */
  onClose?: () => void;
};

export function CategoryTree({
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
                className="hover:bg-light group flex w-full items-center rounded-md transition-colors"
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
                    className={`text-light-gray h-3 w-3 transition-transform duration-150 ${
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
                  isSelected ? 'bg-lighter-blue text-blue' : 'hover:bg-light'
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
  selectedAssigneeId,
  onAssigneeSelect,
  ticketFilters,
  selectedCategoryId = null,
  onClose,
}: TicketSidebarProps) {
  const {
    categories: ownedCategories,
    sections,
    isLoading: isLoadingCategories,
  } = useCategoriesData();

  /*
   * The filter tree lists the Netcorp presets alongside the tenant's own.
   *
   * useCategoriesData reads /v1/categories, which filters to
   * `Audience == Tenant && TenantId == caller's tenant`. The standard Netcorp
   * categories are Audience=Principal with no TenantId, so they are invisible
   * to it. Tickets are filed under them, which left the sidebar empty while the
   * grid beside it was full of categorised tickets.
   */
  const { presets, isLoading: isLoadingPresets } = usePresetCategories(
    ownedCategories.map(c => c.id),
  );

  const categories = useMemo(
    () => [...ownedCategories, ...presets],
    [ownedCategories, presets],
  );

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
          <span className="text-sm font-semibold text-dark">Filter</span>
          <IconTip label={'Close filter sidebar'}>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filter sidebar"
              className="flex items-center justify-center rounded-md p-1 hover:bg-light transition-colors"
            >
              <Icon name="XMarkIcon" className="h-5 w-5 text-gray" />
            </button>
          </IconTip>
        </div>
      )}

      {/* Scroll region: Categories + Tags scroll together INSIDE the panel, so a
          long category list never pushes the page itself into a scrollbar. The
          mobile close button above stays pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {/*
          Assignees first, then Categories: the order the work is read in, who
          is holding it before what kind of thing it is.
        */}
        {onAssigneeSelect && (
          <div className="mb-6">
            <h3 className="text-dark mb-2 text-sm font-semibold">Assignees</h3>
            <AssigneeFilterList
              value={selectedAssigneeId}
              onChange={onAssigneeSelect}
              filters={ticketFilters}
            />
          </div>
        )}

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
                ? 'text-dark hover:bg-light'
                : 'bg-lighter-blue text-blue font-medium'
            }`}
          >
            <span className="w-5 flex-shrink-0" aria-hidden="true" />
            All categories
          </button>

          {isLoadingCategories || isLoadingPresets ? (
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
      </div>
    </div>
  );
}
