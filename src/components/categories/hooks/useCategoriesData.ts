import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import type {
  HelpdeskApplicationCategoriesModelsCategoriesHierarchyDto,
  HelpdeskApplicationCategoriesModelsCategoryDto,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

// Map a generated CategoryDto to the local CategoryDto shape.
// Fields fromEmailAddress / fromEmailName / useFromAddressAsReplyTo replace the old
// emailRoutingAddress / emailRoutingProtocol fields that did not exist on the backend DTO.
function mapGeneratedCategory(
  cat: HelpdeskApplicationCategoriesModelsCategoryDto,
  sectionName?: string,
): CategoryDto {
  // HelpdeskDomainCategoriesEnumsAccessLevel uses string values ('Everyone'|'AgentsOnly'|'AdminsOnly')
  // that are identical to the local AccessLevel enum keys — cast via lookup map for safety.
  const accessLevelMap: Record<string, AccessLevel> = {
    Everyone: AccessLevel.Everyone,
    AgentsOnly: AccessLevel.AgentsOnly,
    AdminsOnly: AccessLevel.AdminsOnly,
  };
  const accessLevel =
    accessLevelMap[cat.accessLevel as string] ?? AccessLevel.Everyone;

  return {
    id: cat.id ?? '',
    name: cat.name ?? '',
    sectionId: cat.sectionId ?? undefined,
    sectionName,
    accessLevel,
    defaultAssigneeId: undefined,
    fromEmailAddress: cat.fromEmailAddress ?? undefined,
    fromEmailName: cat.fromEmailName ?? undefined,
    useFromAddressAsReplyTo: cat.useFromAddressAsReplyTo ?? false,
    isActive: cat.isActive ?? true,
    sortOrder: cat.sortOrder ?? 0,
    customFieldIds: cat.customFieldIds ?? undefined,
  };
}

export const useCategoriesData = () => {
  const {
    data: hierarchyData,
    isLoading: isLoadingCategories,
    refetch: refetchCategories,
  } = useQuery<CategoryDto[]>({
    queryKey: ['helpdesk-categories'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const { data } = await client.v1CategoriesGet();
      // Use the generated hierarchy type directly — no local CategoryItemDto / CategoryHierarchyDto needed.
      const hierarchy =
        data as HelpdeskApplicationCategoriesModelsCategoriesHierarchyDto;
      const flatCategories: CategoryDto[] = [];

      hierarchy.sections?.forEach(section => {
        section.categories?.forEach(cat => {
          flatCategories.push(mapGeneratedCategory(cat, section.name));
        });
      });

      // D23 fix: unsectionedCategories was ignored — categories created without a section
      // were never included in the list, causing them to be invisible until a hard refresh
      // that happened to bust the browser cache rather than the React Query cache.
      hierarchy.unsectionedCategories?.forEach(cat => {
        flatCategories.push(mapGeneratedCategory(cat, undefined));
      });

      return flatCategories;
    },
  });

  const {
    data: sectionsData,
    isLoading: isLoadingSections,
    refetch: refetchSections,
  } = useQuery<SectionDto[]>({
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
