import { createIdentityApiClient } from '@/utils/identityApiClient';
import { LookupApi } from '@brainforgeau/identity-management-client';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Display names for tenant ids, from identity-management's lookup
 * (`GET v1/tenants/{id}/summary`, open to every signed-in user).
 *
 * The helpdesk holds no tenant names: a category carries its owner's id and a
 * ticket row the id of the tenant that handles it. This turns those into
 * "Sent to Acme" and the Handled by badge. A name that cannot be read is left
 * out, and the callers fall back to a generic word.
 */
export const useTenantNames = (
  tenantIds: ReadonlyArray<string | null | undefined>,
): Record<string, string> => {
  const ids = useMemo(
    () => [...new Set(tenantIds.filter((id): id is string => !!id))].sort(),
    [tenantIds],
  );
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['tenant-name', id],
      // Names change rarely; the server marks the summary cacheable for 30 minutes.
      staleTime: 30 * 60 * 1000,
      retry: false,
      queryFn: async () => {
        const client = await createIdentityApiClient(LookupApi);
        const { data } = await client.v1TenantsIdSummaryGet(id);
        return data.displayName || data.name || null;
      },
    })),
  });

  // A stable string so the record only changes when a name does (useQueries
  // returns a new array on every render).
  const key = results.map((r, i) => `${ids[i]}=${r.data ?? ''}`).join('|');
  // biome-ignore lint/correctness/useExhaustiveDependencies: key captures results
  return useMemo(() => {
    const names: Record<string, string> = {};
    results.forEach((r, i) => {
      if (r.data) names[ids[i]] = r.data;
    });
    return names;
  }, [key]);
};
