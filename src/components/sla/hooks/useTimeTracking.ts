import {
  type HelpdeskApplicationTimeTrackingDTOsTimeEntryDto,
  TimeTrackingApi,
} from '@/api/helpdesk-client';
import { TIME_TRACKING_ENABLED } from '@/constants/features';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type TimeEntryDto = HelpdeskApplicationTimeTrackingDTOsTimeEntryDto;

export interface TicketTimeTrackingDto {
  ticketId: string;
  totalMinutes: number;
  entries: TimeEntryDto[];
}

export const useTimeTracking = (ticketId: string) => {
  const { data, isLoading, refetch } = useQuery<TicketTimeTrackingDto>({
    queryKey: ['time-tracking', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);
      const response =
        await client.v1TimeTrackingTicketsTicketIdEntriesGet(ticketId);
      const entries = response.data ?? [];

      const totalMinutes = entries.reduce(
        (sum, entry) => sum + (entry.durationMinutes ?? 0),
        0,
      );

      return {
        ticketId,
        totalMinutes,
        entries,
      };
    },
    enabled: TIME_TRACKING_ENABLED && Boolean(ticketId),
  });

  return {
    timeTracking: data,
    isLoading,
    refetch,
  };
};

export const useAddTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      durationMinutes,
      description,
      entryDate,
    }: {
      ticketId: string;
      durationMinutes: number;
      description?: string;
      entryDate?: string;
    }) => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);
      const response = await client.v1TimeTrackingEntriesPost({
        ticketId,
        durationMinutes,
        description,
        entryDate: entryDate ?? new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['time-tracking', variables.ticketId],
      });
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
      description,
      entryDate,
    }: {
      entryId: string;
      ticketId: string;
      durationMinutes?: number;
      description?: string;
      entryDate?: string;
    }) => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);
      const response = await client.v1TimeTrackingEntriesIdPut(entryId, {
        durationMinutes,
        description,
        entryDate,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['time-tracking', variables.ticketId],
      });
    },
  });
};

export const useDeleteTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      ticketId,
    }: { entryId: string; ticketId: string }) => {
      const client = await createHelpdeskApiClient(TimeTrackingApi);
      await client.v1TimeTrackingEntriesIdDelete(entryId);
      return { entryId, ticketId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['time-tracking', variables.ticketId],
      });
    },
  });
};
