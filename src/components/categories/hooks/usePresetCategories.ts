import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { AccessLevel, type CategoryDto } from '@/types/category';
import { PlatformMyCategoriesApi } from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';

/**
 * The ids of categories the tenant can use but does not own.
 *
 * These are the standard Netcorp categories: Audience=Principal, no TenantId.
 * The configuration screen reads /v1/categories, which filters to
 * `Audience == Tenant && TenantId == caller's tenant`, so the presets are
 * invisible there. They still need to be listed, because a category that
 * appears in the request form and nowhere in Configuration looks like a bug.
 *
 * WHY A DIFFERENCE RATHER THAN A FLAG
 * Neither endpoint returns the audience, so nothing on a row says "preset".
 * What does distinguish them is the pair of endpoints: /v1/platform/my-categories
 * returns everything the caller may choose across audiences, and /v1/categories
 * returns only what the tenant owns. Anything in the first and not the second
 * is a preset by definition, with no guessing from names.
 *
 * The honest alternative is to project Audience onto the DTO and read it
 * directly. That is a backend change and an OpenAPI regeneration; this needs
 * neither and gives the same answer.
 */
/**
 * AccessLevel is a numeric enum locally but arrives from the API as its NAME
 * ("Everyone"), the same wire shape mismatch the ticket status enums have.
 * Casting the string straight to the enum would type check under `as unknown`
 * and then compare wrong against every numeric member.
 */
const toAccessLevel = (value: unknown): AccessLevel => {
  if (typeof value === 'number') return value as AccessLevel;
  if (typeof value === 'string' && value in AccessLevel) {
    return AccessLevel[value as keyof typeof AccessLevel];
  }
  return AccessLevel.Everyone;
};

export const usePresetCategories = (ownedIds: string[]) => {
  const { data, isLoading } = useQuery({
    queryKey: ['preset-categories'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PlatformMyCategoriesApi);
      const { data } = await client.v1PlatformMyCategoriesGet();
      return data ?? [];
    },
  });

  const owned = new Set(ownedIds);

  // Mapped into the local CategoryDto the table expects. The generated DTO
  // makes every field optional, so the required ones are defaulted here rather
  // than leaving the table to cope with half a row.
  const presets: CategoryDto[] = (data ?? [])
    .filter(c => c.id && !owned.has(c.id))
    .map(c => ({
      id: c.id as string,
      name: c.name ?? '',
      sectionId: c.sectionId ?? undefined,
      sectionName: c.sectionName ?? undefined,
      accessLevel: toAccessLevel(c.accessLevel),
      fromEmailAddress: c.fromEmailAddress ?? undefined,
      fromEmailName: c.fromEmailName ?? undefined,
      useFromAddressAsReplyTo: c.useFromAddressAsReplyTo ?? false,
      isActive: c.isActive ?? true,
      sortOrder: c.sortOrder ?? 0,
      customFieldIds: c.customFieldIds ?? undefined,
    }));

  return {
    presets,
    presetIds: new Set(presets.map(c => c.id)),
    isLoading,
  };
};
