import { useState } from 'react';
import { Icon } from '@brainforgeau/components/base';
import { Chip } from '@heroui/react';

type Category = {
  id: string;
  name: string;
  children?: Category[];
};

type TicketSidebarProps = {
  onCategorySelect?: (categoryId: string | null) => void;
  onTagSelect?: (tag: string) => void;
  selectedTags?: string[];
};

// REVIEW: Hardcoded categories for now - should come from API
const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Technical Support',
    children: [
      { id: '1-1', name: 'Hardware' },
      { id: '1-2', name: 'Software' },
      { id: '1-3', name: 'Network' },
    ],
  },
  {
    id: '2',
    name: 'Customer Service',
    children: [
      { id: '2-1', name: 'Billing' },
      { id: '2-2', name: 'Account' },
      { id: '2-3', name: 'General' },
    ],
  },
  {
    id: '3',
    name: 'Sales',
    children: [
      { id: '3-1', name: 'New Customer' },
      { id: '3-2', name: 'Upgrade' },
    ],
  },
];

// REVIEW: Hardcoded tags for now - should come from API
const mockTags = ['urgent', 'vip', 'bug', 'feature-request', 'feedback'];

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
        <CategoryTree categories={mockCategories} onSelect={onCategorySelect || (() => {})} />
      </div>

      {/* Tags Section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-default-700">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {mockTags.map((tag) => (
            <Chip
              key={tag}
              size="sm"
              variant={selectedTags.includes(tag) ? 'solid' : 'bordered'}
              color={selectedTags.includes(tag) ? 'primary' : 'default'}
              className="cursor-pointer"
              onClick={() => onTagSelect?.(tag)}
            >
              {tag}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
