import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationSlaQueriesGetBusinessHoursSchedulesBusinessHoursScheduleSummaryDto,
  SlaApi,
} from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';

export type BusinessHoursScheduleSummary =
  HelpdeskApplicationSlaQueriesGetBusinessHoursSchedulesBusinessHoursScheduleSummaryDto;

const QUERY_KEY = 'sla-business-hours-schedules';

export function useBusinessHoursSchedules() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1SlaSchedulesGet();
      return response.data ?? [];
    },
    staleTime: 60_000,
  });
}
