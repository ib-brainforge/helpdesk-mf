import { type SortKeys, toSortParam } from '@/utils/listSort';
import type { SortingState } from '@tanstack/react-table';

/** Sortable columns by column id, with the key of `GET kb/articles`'s `sort` each one sorts on. */
export const KB_SORT_KEYS = {
  title: 'title',
  status: 'status',
  accessLevel: 'accessLevel',
  publishedAt: 'publishedAt',
  views: 'viewCount',
  createdAt: 'createdAt',
  updatedAt: 'modifiedAt',
} as const;

/**
 * The search endpoint ranks by relevance and takes no sort, so while a search
 * term is set no column sorts.
 */
export const kbSortKeys = (search: string): SortKeys =>
  search.trim() ? {} : KB_SORT_KEYS;

/** The `sort` argument of the article request: never sent while searching. */
export const kbSortParam = (
  sorting: SortingState,
  search: string,
): string | undefined =>
  search.trim() ? undefined : toSortParam(sorting, KB_SORT_KEYS);
