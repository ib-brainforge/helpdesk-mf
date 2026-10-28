import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';

/** Categories rarely change; a saved category refreshes them. */
const STALE_MS = 10 * 60 * 1000;

/**
 * The categories a requester may choose, with their real ids: the tenant's own
 * categories plus the Provider's preset categories (/v1/categories/available),
 * so a tenant with no categories of its own can still raise a request. The
 * ticket create command rejects a request with no CategoryId, so the wizard
 * resolves its request types against this list.
 */
export const useRequestCategories = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['helpdesk-categories', 'available'],
    staleTime: STALE_MS,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      const { data } = await client.v1CategoriesAvailableGet();
      return data ?? [];
    },
  });
  return { categories: data ?? [], isLoading };
};
