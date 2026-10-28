import { createIdentityApiClient } from '@/utils/identityApiClient';
import { TenantsApi } from '@brainforgeau/identity-management-client';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

const HELPDESK_APP = 'helpdesk';

/**
 * Which of these companies have Helpdesk licensed, so pickers can leave out
 * the rest instead of letting someone choose one and then hit "Helpdesk isn't
 * enabled".
 *
 * Identity owns licensing (GET /v1/tenants/{id}/license); the contexts list
 * has no apps field yet, so this asks once per company and caches it for the
 * session. A company whose licence cannot be read (the route refused, or it
 * is still loading) is kept: hiding a company someone can use would be worse
 * than the message they get today.
 */
export const useHelpdeskLicensedTenants = (tenantIds: string[]) => {
  const results = useQueries({
    queries: tenantIds.map(id => ({
      queryKey: ['tenant-license', id],
      staleTime: 30 * 60 * 1000,
      retry: false,
      queryFn: async () => {
        const client = await createIdentityApiClient(TenantsApi);
        const { data } = await client.v1TenantsIdLicenseGet(id);
        return (data?.licensedApps ?? []).map(a => a.toLowerCase());
      },
    })),
  });

  // The ids known to be unlicensed, as a stable string so the result only
  // changes when an answer does (useQueries returns a new array each render).
  const unlicensedKey = tenantIds
    .filter((id, i) => {
      const apps = results[i]?.data;
      return apps && !apps.includes(HELPDESK_APP);
    })
    .join('|');
  const isLoading = results.some(r => r.isLoading);

  return useMemo(() => {
    const unlicensed = new Set(unlicensedKey ? unlicensedKey.split('|') : []);
    return {
      isLicensed: (id: string) => !unlicensed.has(id),
      isLoading,
    };
  }, [unlicensedKey, isLoading]);
};
