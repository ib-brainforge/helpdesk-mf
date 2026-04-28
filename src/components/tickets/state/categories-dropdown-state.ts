import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { atomWithMutation } from 'jotai-tanstack-query';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';

export interface CategoryOption {
  id: string;
  name: string;
  sectionName?: string;
}

type CategoryHierarchyDto = {
  sections?: Array<{
    id?: string;
    name?: string;
    categories?: Array<{
      id?: string;
      name?: string;
      sectionId?: string;
      isActive?: boolean;
    }>;
  }>;
};

export const categoriesMutationAtom = atomWithMutation<CategoryOption[], { query: string }>(() => ({
  mutationKey: ['categories-search'],
  mutationFn: async ({ query }: { query: string }) => {
    const client = await createHelpdeskApiClient(CategoriesApi);
    const { data } = await client.v1CategoriesGet();

    // Flatten hierarchy into flat array of categories
    const hierarchy = data as CategoryHierarchyDto;
    const flatCategories: CategoryOption[] = [];

    hierarchy.sections?.forEach((section) => {
      section.categories?.forEach((cat) => {
        if (cat.isActive !== false) {
          const categoryName = cat.name ?? 'Unnamed Category';
          const sectionName = section.name;

          // Filter by query if provided
          const matchesQuery = !query ||
            categoryName.toLowerCase().includes(query.toLowerCase()) ||
            (sectionName && sectionName.toLowerCase().includes(query.toLowerCase()));

          if (matchesQuery) {
            flatCategories.push({
              id: cat.id!,
              name: categoryName,
              sectionName: sectionName,
            });
          }
        }
      });
    });

    return flatCategories;
  },
}));

export const mapCategoryToOption = (category: CategoryOption): CategoryOption => category;
