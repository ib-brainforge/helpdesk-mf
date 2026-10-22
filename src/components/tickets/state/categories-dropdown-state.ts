import { PlatformMyCategoriesApi } from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { atomWithMutation } from 'jotai-tanstack-query';

export interface CategoryOption {
  id: string;
  name: string;
  sectionName?: string;
}

export const categoriesMutationAtom = atomWithMutation<
  CategoryOption[],
  { query: string }
>(() => ({
  mutationKey: ['categories-search'],
  mutationFn: async ({ query }: { query: string }) => {
    const client = await createHelpdeskApiClient(PlatformMyCategoriesApi);
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
