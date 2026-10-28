import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  CSATReportFilters,
  SatisfactionRatingsListFilters,
} from '@/types';
import {
  type HelpdeskApplicationSatisfactionCommandsSubmitSatisfactionRatingSubmitSatisfactionRatingCommand,
  type HelpdeskApplicationSatisfactionCommandsUpdateSatisfactionRatingUpdateSatisfactionRatingCommand,
  SatisfactionApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useSatisfactionRatingByTicket = (ticketId: string) => {
  return useQuery({
    queryKey: ['satisfaction', 'ticket', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(SatisfactionApi);
      try {
        const { data } = await client.v1SatisfactionTicketTicketIdGet(ticketId);
        return data;
      } catch (error) {
        // 404 is the normal answer for a ticket nobody has rated yet: an
        // empty result, not a failure to retry.
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          404
        )
          return null;
        throw error;
      }
    },
    enabled: !!ticketId,
  });
};

export const useSatisfactionRatings = (
  filters: SatisfactionRatingsListFilters,
) => {
  return useQuery({
    queryKey: ['satisfaction', 'list', filters],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(SatisfactionApi);
      const { data } = await client.v1SatisfactionGet(
        filters.dateFrom,
        filters.dateTo,
        filters.rating,
        filters.assignedTechnicianId,
        filters.categoryId,
        filters.page,
        filters.pageSize,
      );
      return data;
    },
  });
};

export const useCSATReport = (filters: CSATReportFilters) => {
  return useQuery({
    queryKey: ['satisfaction', 'report', filters],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(SatisfactionApi);
      const { data } = await client.v1SatisfactionReportGet(
        filters.dateFrom,
        filters.dateTo,
        filters.groupBy,
      );
      return data;
    },
  });
};

export const useSubmitSatisfactionRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationSatisfactionCommandsSubmitSatisfactionRatingSubmitSatisfactionRatingCommand,
    ) => {
      const client = await createHelpdeskApiClient(SatisfactionApi);
      const { data } = await client.v1SatisfactionSubmitPost(command);
      return data;
    },
    onSuccess: () => {
      // REVIEW: Invalidate satisfaction queries after submission
      queryClient.invalidateQueries({ queryKey: ['satisfaction'] });
    },
  });
};

export const useUpdateSatisfactionRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ratingId,
      command,
    }: {
      ratingId: string;
      command: HelpdeskApplicationSatisfactionCommandsUpdateSatisfactionRatingUpdateSatisfactionRatingCommand;
    }) => {
      const client = await createHelpdeskApiClient(SatisfactionApi);
      const { data } = await client.v1SatisfactionIdPut(ratingId, command);
      return data;
    },
    onSuccess: () => {
      // REVIEW: Invalidate satisfaction queries after update
      queryClient.invalidateQueries({ queryKey: ['satisfaction'] });
    },
  });
};
