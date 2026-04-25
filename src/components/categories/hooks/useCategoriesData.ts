import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { configAtom } from '@/state/config';
import { authorizedAxios } from '@/state/authorizedAxios';
import type { CategoryDto, SectionDto } from '@/types/category';
import type { RuntimeConfig } from '@brainforgeau/security';
import { getDefaultStore } from 'jotai';

// REVIEW: useDuplicateCategory uses authorizedAxios directly because the POST /v1/categories/{id}/duplicate
// endpoint is not yet in the published @brainforgeau/helpdesk-client. Switch to generated client
// after the backend Wave 6 PR is merged and the client package is regenerated.
const getCategoryApiBaseUrl = (): string => {
  const store = getDefaultStore();
  const config = store.get(configAtom) as RuntimeConfig;
  return config?.api?.baseUrl ?? '';
};

export const useDuplicateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const baseUrl = getCategoryApiBaseUrl();
      const response = await authorizedAxios.post<string>(
        `${baseUrl}/v1/categories/${categoryId}/duplicate`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
    },
  });
};

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
