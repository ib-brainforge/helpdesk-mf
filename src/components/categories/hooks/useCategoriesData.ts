import { CategoriesApi } from '@/api/helpdesk-client';
import type {
  HelpdeskApplicationCategoriesModelsCategoriesHierarchyDto,
  HelpdeskApplicationCategoriesModelsCategoryDto,
} from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useDuplicateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const response = await client.v1CategoriesIdDuplicatePost(categoryId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
    },
  });
};

/**
 * Marks or unmarks a category as the tenant's customer-portal enquiry category.
 * Marking one moves the mark off the previous one on the server.
 */
export const useSetPortalEnquiryCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { categoryId: string; isMarked: boolean }) => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      await client.v1CategoriesIdPortalEnquiryPatch(args.categoryId, {
        isPortalEnquiryCategory: args.isMarked,
      });
    },
    onSettled: () => {
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
    fromEmailAddress: cat.fromEmailAddress ?? undefined,
    fromEmailName: cat.fromEmailName ?? undefined,
    useFromAddressAsReplyTo: cat.useFromAddressAsReplyTo ?? false,
    isActive: cat.isActive ?? true,
    sortOrder: cat.sortOrder ?? 0,
    customFieldIds: cat.customFieldIds ?? undefined,
    isPortalEnquiryCategory: cat.isPortalEnquiryCategory ?? false,
  };
}

/** Categories and sections are reference data that rarely change; saves refresh them. */
const REFERENCE_STALE_MS = 10 * 60 * 1000;

/**
 * The company's categories, and with `withSections` its sections too. Only
 * the Categories configuration page shows sections, so the list and the
 * reports no longer fetch them.
 */
export const useCategoriesData = ({
  withSections = false,
}: { withSections?: boolean } = {}) => {
  const {
    data: hierarchyData,
    isLoading: isLoadingCategories,
    refetch: refetchCategories,
  } = useQuery<CategoryDto[]>({
    queryKey: ['helpdesk-categories'],
    staleTime: REFERENCE_STALE_MS,
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
    enabled: withSections,
    staleTime: REFERENCE_STALE_MS,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const { data } = await client.v1CategoriesSectionsGet();
      // API returns PagedResult, extract items. `meta` (record placement/audit
      // metadata -- DTO tenancy/scope metadata initiative) is carried through
      // so SectionEditorModal can wire the scope strip; it was previously
      // dropped here even though SectionDto has always returned it.
      return (data.items ?? []).map(section => ({
        id: section.id ?? '',
        name: section.name ?? '',
        sortOrder: section.sortOrder ?? 0,
        isActive: section.isActive ?? true,
        meta: section.meta,
      }));
    },
  });

  return {
    categories: hierarchyData ?? [],
    sections: sectionsData ?? [],
    isLoading: isLoadingCategories || (withSections && isLoadingSections),
    refetchCategories,
    refetchSections,
    refetchAll: () => {
      refetchCategories();
      refetchSections();
    },
  };
};
