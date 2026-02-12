import { useQuery } from '@tanstack/react-query';
import { SlaApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { SlaIndicatorDto } from '@/types';

// REVIEW: Backend doesn't have SLA status per ticket endpoint yet
// This is a placeholder that returns mock data
// The real implementation will be added when backend endpoint is available
export const useSla = (ticketId: string) => {
  const { data, isLoading, refetch } = useQuery<SlaIndicatorDto | undefined>({
    queryKey: ['sla', ticketId],
    queryFn: async () => {
      // REVIEW: Returning undefined until backend endpoint is available
      // Backend needs to add: GET /v1/sla/ticket/{ticketId}
      return undefined;
    },
    enabled: Boolean(ticketId),
  });

  return {
    slaData: data,
    isLoading,
    refetch,
  };
};

export const useSlaPolicies = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(SlaApi);

      // REVIEW: Fetch all SLA policies for configuration/display purposes
      const response = await client.v1SlaGet();
      return response.data ?? [];
    },
  });

  return {
    policies: data ?? [],
    isLoading,
    refetch,
  };
};
