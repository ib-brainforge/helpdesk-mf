import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';

export const useDuplicateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const response = await client.v1CategoriesIdDuplicatePost(categoryId);
      return response.data as unknown as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
    },
  });
};

// Local shape of the CategoriesHierarchyDto returned by GET /v1/categories.
// The backend returns both sectioned and unsectioned categories; both must be parsed.
type CategoryItemDto = {
  id?: string;
  name?: string;
  sectionId?: string;
  sectionName?: string;
  accessLevel?: number;
  defaultAssigneeId?: string;
  emailRoutingAddress?: string;
  emailRoutingProtocol?: string;
  isActive?: boolean;
  sortOrder?: number;
  customFieldIds?: string[];
};

type CategoryHierarchyDto = {
  sections?: Array<{
    id?: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
    categories?: CategoryItemDto[];
  }>;
  // Categories that belong to no section — must be included in the flat list
  unsectionedCategories?: CategoryItemDto[];
};

const mapCategoryItem = (cat: CategoryItemDto, sectionName?: string): CategoryDto => ({
  id: cat.id!,
  name: cat.name!,
  sectionId: cat.sectionId,
  sectionName,
  accessLevel: cat.accessLevel ?? 0,
  defaultAssigneeId: cat.defaultAssigneeId,
  emailRoutingAddress: cat.emailRoutingAddress,
  emailRoutingProtocol: cat.emailRoutingProtocol,
  isActive: cat.isActive ?? true,
  sortOrder: cat.sortOrder ?? 0,
  customFieldIds: cat.customFieldIds,
});

export const useCategoriesData = () => {
  const { data: hierarchyData, isLoading: isLoadingCategories, refetch: refetchCategories } = useQuery<CategoryDto[]>({
    queryKey: ['helpdesk-categories'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const { data } = await client.v1CategoriesGet();
      // Flatten hierarchy into a single array: sectioned categories first, then unsectioned.
      const hierarchy = data as CategoryHierarchyDto;
      const flatCategories: CategoryDto[] = [];

      hierarchy.sections?.forEach((section) => {
        section.categories?.forEach((cat) => {
          flatCategories.push(mapCategoryItem(cat, section.name));
        });
      });

      // D23 fix: unsectionedCategories was ignored — categories created without a section
      // were never included in the list, causing them to be invisible until a hard refresh
      // that happened to bust the browser cache rather than the React Query cache.
      hierarchy.unsectionedCategories?.forEach((cat) => {
        flatCategories.push(mapCategoryItem(cat, undefined));
      });

      return flatCategories;
    },
  });

  const { data: sectionsData, isLoading: isLoadingSections, refetch: refetchSections } = useQuery<SectionDto[]>({
    queryKey: ['helpdesk-sections'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const { data } = await client.v1CategoriesSectionsGet();
      // API returns PagedResult, extract items
      return ((data as any)?.items || []).map((section: any) => ({
        id: section.id!,
        name: section.name!,
        sortOrder: section.sortOrder ?? 0,
        isActive: section.isActive ?? true,
      }));
    },
  });

  return {
    categories: hierarchyData ?? [],
    sections: sectionsData ?? [],
    isLoading: isLoadingCategories || isLoadingSections,
    refetchCategories,
    refetchSections,
    refetchAll: () => {
      refetchCategories();
      refetchSections();
    },
  };
};
