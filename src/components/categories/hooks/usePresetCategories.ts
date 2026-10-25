import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { AccessLevel, type CategoryDto } from '@/types/category';
import { PlatformMyCategoriesApi } from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { defaultAssigneeOf } from './useCategoriesData';

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

  /*
   * Memoised, and keyed on the ids' CONTENT rather than the array, which the
   * caller rebuilds on every render.
   *
   * These rows feed a TanStack table with pagination, which resets its page
   * index (a state update) whenever its data changes identity. Built fresh on
   * each render, the presets made every render look like new data, so the
   * reset caused a render, which rebuilt them, which caused another reset. Page
   * load got away with it; the first re-render after it, such as opening the
   * Delete confirmation or typing in the search, froze the tab.
   */
  const ownedKey = ownedIds.join(',');

  // Mapped into the local CategoryDto the table expects. The generated DTO
  // makes every field optional, so the required ones are defaulted here rather
  // than leaving the table to cope with half a row.
  const presets: CategoryDto[] = useMemo(() => {
    const owned = new Set(ownedKey ? ownedKey.split(',') : []);
    return (data ?? [])
      .filter(c => c.id && !owned.has(c.id))
      .map(c => ({
        id: c.id as string,
        name: c.name ?? '',
        sectionId: c.sectionId ?? undefined,
        sectionName: c.sectionName ?? undefined,
        accessLevel: toAccessLevel(c.accessLevel),
        defaultAssigneeId: defaultAssigneeOf(c),
        fromEmailAddress: c.fromEmailAddress ?? undefined,
        fromEmailName: c.fromEmailName ?? undefined,
        useFromAddressAsReplyTo: c.useFromAddressAsReplyTo ?? false,
        isActive: c.isActive ?? true,
        sortOrder: c.sortOrder ?? 0,
        customFieldIds: c.customFieldIds ?? undefined,
      }));
  }, [data, ownedKey]);

  const presetIds = useMemo(() => new Set(presets.map(c => c.id)), [presets]);

  return { presets, presetIds, isLoading };
};
