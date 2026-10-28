import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
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
    const client = await createHelpdeskApiClient(CategoriesApi);
    const { data } = await client.v1CategoriesGet();

    const categories: CategoryOption[] = [
      ...(data.sections ?? []).flatMap(section =>
        (section.categories ?? []).map(cat => ({
          cat,
          sectionName: section.name ?? undefined,
        })),
      ),
      ...(data.unsectionedCategories ?? []).map(cat => ({
        cat,
        sectionName: undefined,
      })),
    ]
      .filter(({ cat }) => cat.isActive !== false)
      .map(({ cat, sectionName }) => ({
        id: cat.id ?? '',
        name: cat.name ?? 'Unnamed Category',
        sectionName,
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
