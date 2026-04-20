/**
 * usePrincipalReports — fetches principal ticket-volume report.
 *
 * The published @brainforgeau/helpdesk-client does not yet export PrincipalReportsApi.
 * We use ReportsApi as the class token and cast to `any` to call the principal-scoped
 * methods at runtime.
 *
 * REVIEW: Remove casts once helpdesk-backend republishes with PrincipalReportsApi exported.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { ReportsApi } from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';

const QUERY_KEY = 'principal-reports-ticket-volume';

export interface TicketVolumeItem {
  date?: string;
  count?: number;
}

export function usePrincipalTicketVolume(
  principalId: string,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, from, to],
    queryFn: async (): Promise<TicketVolumeItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(ReportsApi);
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
