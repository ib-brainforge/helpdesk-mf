import type { KnowledgeBaseCategoryDto } from '@/types';

export type CategoryRow = KnowledgeBaseCategoryDto & { depth: number };

/**
 * The rows of the Manage Categories table: the categories whose name matches
 * the search, ordered so each sub-category sits directly under its parent,
 * with `depth` saying how far to indent its name.
 *
 * A match whose parent does not match (or is missing) still shows, at the
 * depth it has in the full tree, so searching never hides a hit.
 */
export function buildCategoryRows(
  categories: KnowledgeBaseCategoryDto[],
  search: string,
): CategoryRow[] {
  const term = search.trim().toLowerCase();
  const byId = new Map(categories.map(c => [c.id, c]));

  const depthOf = (category: KnowledgeBaseCategoryDto): number => {
    let depth = 0;
    const seen = new Set<string>([category.id]);
    let parent = category.parentId ? byId.get(category.parentId) : undefined;
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id);
      depth += 1;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return depth;
  };

  const visible = categories.filter(c => c.name.toLowerCase().includes(term));
  const visibleIds = new Set(visible.map(c => c.id));

  const children = new Map<string, KnowledgeBaseCategoryDto[]>();
  const roots: KnowledgeBaseCategoryDto[] = [];
  for (const category of visible) {
    if (category.parentId && visibleIds.has(category.parentId)) {
      const siblings = children.get(category.parentId) ?? [];
      siblings.push(category);
      children.set(category.parentId, siblings);
    } else {
      roots.push(category);
    }
  }

  const rows: CategoryRow[] = [];
  const emitted = new Set<string>();
  const emit = (category: KnowledgeBaseCategoryDto) => {
    if (emitted.has(category.id)) return;
    emitted.add(category.id);
    rows.push({ ...category, depth: depthOf(category) });
    for (const child of children.get(category.id) ?? []) emit(child);
  };
  roots.forEach(emit);
  // Only a parent cycle leaves anything unreached; show it rather than hide it.
  visible.forEach(emit);
  return rows;
}
