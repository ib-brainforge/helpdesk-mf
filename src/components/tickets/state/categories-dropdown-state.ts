import type { HelpdeskScope } from '@/api/local/scoped';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { PlatformMyCategoriesApi } from '@brainforgeau/helpdesk-client';
import { atomWithMutation } from 'jotai-tanstack-query';

export interface CategoryOption {
  id: string;
  name: string;
  sectionName?: string;
}

export const categoriesMutationAtom = atomWithMutation<
  CategoryOption[],
  /** `scope`: the ticket's company, whose categories these are. */
  { query: string; scope?: HelpdeskScope | null }
>(() => ({
  mutationKey: ['categories-search'],
  mutationFn: async ({
    query,
    scope,
  }: { query: string; scope?: HelpdeskScope | null }) => {
    const client = await createHelpdeskApiClient(
      PlatformMyCategoriesApi,
      scope,
    );
    const { data } = await client.v1PlatformMyCategoriesGet();

    // data is a flat CategoryDto[] — no hierarchy unwrapping needed.
    const categories: CategoryOption[] = (data ?? [])
      .filter(cat => cat.isActive !== false)
      .map(cat => ({
        id: cat.id ?? '',
        name: cat.name ?? 'Unnamed Category',
        sectionName: cat.sectionName ?? undefined,
      }));

    // Filter by query if provided.
    if (!query) return categories;

    const lq = query.toLowerCase();
    return categories.filter(
      cat =>
        cat.name.toLowerCase().includes(lq) ||
        cat.sectionName?.toLowerCase().includes(lq),
    );
  },
}));

export const mapCategoryToOption = (category: CategoryOption): CategoryOption =>
  category;
