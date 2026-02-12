import { useQuery } from '@tanstack/react-query';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';

// REVIEW: Using generated client types directly, flattening hierarchy into flat array for UI
type CategoryHierarchyDto = {
  sections?: Array<{
    id?: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
    categories?: Array<{
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
    }>;
  }>;
};

export const useCategoriesData = () => {
  const { data: hierarchyData, isLoading: isLoadingCategories, refetch: refetchCategories } = useQuery<CategoryDto[]>({
    queryKey: ['helpdesk-categories'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const { data } = await client.v1CategoriesGet();
      // Flatten hierarchy into flat array of categories
      const hierarchy = data as CategoryHierarchyDto;
      const flatCategories: CategoryDto[] = [];
      hierarchy.sections?.forEach((section) => {
        section.categories?.forEach((cat) => {
          flatCategories.push({
            id: cat.id!,
            name: cat.name!,
            sectionId: cat.sectionId,
            sectionName: section.name,
            accessLevel: cat.accessLevel ?? 0,
            defaultAssigneeId: cat.defaultAssigneeId,
            emailRoutingAddress: cat.emailRoutingAddress,
            emailRoutingProtocol: cat.emailRoutingProtocol,
            isActive: cat.isActive ?? true,
            sortOrder: cat.sortOrder ?? 0,
            customFieldIds: cat.customFieldIds,
          });
        });
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
