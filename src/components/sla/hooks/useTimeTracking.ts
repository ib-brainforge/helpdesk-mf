import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TimeTrackingApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  TicketTimeTrackingDto,
  TimeEntryDto,
} from '@/types';

export const useTimeTracking = (ticketId: string) => {
  const { data, isLoading, refetch } = useQuery<TicketTimeTrackingDto>({
    queryKey: ['time-tracking', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);

      // REVIEW: Backend returns list of time entries, we need to aggregate client-side
      const response = await client.v1TimeTrackingTicketsTicketIdEntriesGet(ticketId);
      const entries = (response.data ?? []) as unknown as TimeEntryDto[];

      // Calculate totals
      const totalMinutes = entries.reduce(
        (sum, entry) => sum + (entry.durationMinutes ?? 0),
        0
      );
      const billableMinutes = entries
        .filter(e => e.isBillable)
        .reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0);

      // REVIEW: activeEntry is not supported by backend yet
      // Timer functionality needs backend endpoints: start/stop/pause

      return {
        ticketId,
        totalMinutes,
        billableMinutes,
        entries,
        activeEntry: undefined,
      };
    },
    enabled: Boolean(ticketId),
  });

  return {
    timeTracking: data,
    isLoading,
    refetch,
  };
};

// REVIEW: Timer functionality placeholders - backend doesn't have these endpoints yet
// Backend needs to add: POST /v1/time-tracking/ticket/{ticketId}/start
// Backend needs to add: POST /v1/time-tracking/ticket/{ticketId}/stop
// Backend needs to add: POST /v1/time-tracking/ticket/{ticketId}/pause

export const useStartTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      // REVIEW: Placeholder - backend endpoint not available yet
      console.warn('Start timer endpoint not implemented in backend yet');
      return null;
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking', ticketId] });
    },
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      // REVIEW: Placeholder - backend endpoint not available yet
      console.warn('Stop timer endpoint not implemented in backend yet');
      return null;
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking', ticketId] });
    },
  });
};

export const usePauseTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      // REVIEW: Placeholder - backend endpoint not available yet
      console.warn('Pause timer endpoint not implemented in backend yet');
      return null;
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking', ticketId] });
    },
  });
};

export const useAddTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      durationMinutes,
      notes,
      isBillable = false,
    }: {
      ticketId: string;
      durationMinutes: number;
      notes?: string;
      isBillable?: boolean;
    }) => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);

      // REVIEW: Backend creates a manual time entry
      // REVIEW: isBillable not supported by backend yet - need backend update
      const response = await client.v1TimeTrackingEntriesPost({
        ticketId,
        durationMinutes,
        description: notes,
      } as any);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking', variables.ticketId] });
    },
  });
};

export const useUpdateTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      ticketId,
      durationMinutes,
      isBillable,
    }: {
      entryId: string;
      ticketId: string;
      durationMinutes?: number;
      isBillable?: boolean;
    }) => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);

      // REVIEW: Backend updates an existing time entry
      // REVIEW: isBillable not supported by backend yet - need backend update
      const response = await client.v1TimeTrackingEntriesIdPut(entryId, {
        durationMinutes,
      } as any);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking', variables.ticketId] });
    },
  });
};

export const useDeleteTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, ticketId }: { entryId: string; ticketId: string }) => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);

      // REVIEW: Backend deletes a time entry
      await client.v1TimeTrackingEntriesIdDelete(entryId);
      return { entryId, ticketId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking', variables.ticketId] });
    },
  });
};
