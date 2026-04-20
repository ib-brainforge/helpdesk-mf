/**
 * usePrincipalReports — fetches principal ticket-volume report.
 * Wraps PrincipalReportsApi.v1PrincipalsPrincipalIdReportsTicketVolumeGet.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { PrincipalReportsApi } from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';

const QUERY_KEY = 'principal-reports-ticket-volume';

export function usePrincipalTicketVolume(
  principalId: string,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, from, to],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalReportsApi);
      const response =
        await client.v1PrincipalsPrincipalIdReportsTicketVolumeGet(
          principalId,
          from,
          to,
        );
      return response.data ?? [];
    },
    enabled: Boolean(principalId) && Boolean(from) && Boolean(to),
  });
}
