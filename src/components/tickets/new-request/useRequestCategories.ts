import { useTenantNames } from '@/hooks/useTenantNames';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationCategoriesModelsAvailableCategoryDto as AvailableCategory,
  CategoriesApi,
} from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { groupCategories } from './request-categories';

/** Categories rarely change; a saved category refreshes them. */
const STALE_MS = 10 * 60 * 1000;

/** `GET v1/categories/available`: own categories, then the chain's, nearest first. */
const fetchAvailableCategories = async (): Promise<AvailableCategory[]> => {
  const client = await createHelpdeskApiClient(CategoriesApi);
  const { data } = await client.v1CategoriesAvailableGet();
  return data ?? [];
};

const NO_CATEGORIES: AvailableCategory[] = [];

/**
 * The categories a requester may choose, from `GET v1/categories/available`:
 * the tenant's own, then those shared down by its provider's office and the
 * platform owner's office, grouped by who handles them. The owners' names are
 * resolved through identity for the group titles.
 */
export const useRequestCategories = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['helpdesk-categories', 'available'],
    staleTime: STALE_MS,
    queryFn: fetchAvailableCategories,
  });
  const categories = data ?? NO_CATEGORIES;
  const ownerIds = useMemo(
    () => categories.filter(c => (c.level ?? 0) > 0).map(c => c.ownerTenantId),
    [categories],
  );
  const tenantNames = useTenantNames(ownerIds);
  const groups = useMemo(
    () => groupCategories(categories, tenantNames),
    [categories, tenantNames],
  );
  return { categories, groups, tenantNames, isLoading };
};
