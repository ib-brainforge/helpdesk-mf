import { PlatformMyCategoriesApi } from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useQuery } from '@tanstack/react-query';

/**
 * The categories a requester may actually choose, with their real ids.
 *
 * NOT /v1/categories. That endpoint is tenant scoped, so it returns only
 * Audience=Tenant rows. The Netcorp categories are Audience=Principal with no
 * TenantId, which means a tenant user asking /v1/categories gets an empty list
 * and the wizard has no id to send. The ticket create command rejects a request
 * with no CategoryId ("Category is required"), so that empty list is a 400 on
 * submit rather than a visibly missing dropdown.
 *
 * /v1/platform/my-categories is the surface built for exactly this: it returns
 * what the caller may select, across audiences, resolving the principal from
 * their context.
 */
export const useRequestCategories = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['request-categories'],
    // Categories change rarely and a stale list would only ever cost a refetch,
    // never a wrong write: the id is read at submit time from this same list.
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PlatformMyCategoriesApi);
      const { data } = await client.v1PlatformMyCategoriesGet();
      return data ?? [];
    },
  });

  return { categories: data ?? [], isLoading };
};
