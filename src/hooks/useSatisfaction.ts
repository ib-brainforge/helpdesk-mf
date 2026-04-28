import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  SatisfactionRatingDto,
  SubmitSatisfactionRatingRequest,
  UpdateSatisfactionRatingRequest,
  CSATReportDto,
  CSATReportFilters,
  SatisfactionRatingsListFilters,
} from '@/types';

// REVIEW: Following existing API hook patterns - TanStack Query + generated client
// REVIEW: SatisfactionApi will be generated from backend OpenAPI spec once backend PR is merged
// Using placeholder for now - the API client will be auto-generated
const SatisfactionApi = class {} as any;

export const useSatisfactionRatingByTicket = (ticketId: string) => {
  return useQuery<SatisfactionRatingDto | null>({
    queryKey: ['satisfaction', 'ticket', ticketId],
    queryFn: async () => {
      const client: any = await createHelpdeskApiClient(SatisfactionApi as any);
      const { data } = await client.v1SatisfactionTicketTicketIdGet(ticketId);
      return (data as unknown) as SatisfactionRatingDto | null;
    },
    enabled: !!ticketId,
  });
};

export const useSatisfactionRatings = (filters: SatisfactionRatingsListFilters) => {
  return useQuery({
    queryKey: ['satisfaction', 'list', filters],
    queryFn: async () => {
      const client: any = await createHelpdeskApiClient(SatisfactionApi as any);
      const { data } = await client.v1SatisfactionGet(
        filters.dateFrom,
        filters.dateTo,
        filters.rating,
        filters.assignedTechnicianId,
        filters.categoryId,
        filters.page,
        filters.pageSize,
      );
      return data as unknown as { items: SatisfactionRatingDto[]; totalCount: number };
    },
  });
};

export const useCSATReport = (filters: CSATReportFilters) => {
  return useQuery<CSATReportDto>({
    queryKey: ['satisfaction', 'report', filters],
    queryFn: async () => {
      const client: any = await createHelpdeskApiClient(SatisfactionApi as any);
      const { data } = await client.v1SatisfactionReportGet(
        filters.dateFrom,
        filters.dateTo,
        filters.groupBy as any,
      );
      return (data as unknown) as CSATReportDto;
    },
  });
};

export const useSubmitSatisfactionRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SubmitSatisfactionRatingRequest) => {
      const client: any = await createHelpdeskApiClient(SatisfactionApi as any);
      const { data } = await client.v1SatisfactionSubmitPost({
        token: request.token,
        rating: request.rating,
        comment: request.comment,
      } as any);
      return data as unknown as { id: string };
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
    mutationFn: async (request: UpdateSatisfactionRatingRequest) => {
      const client: any = await createHelpdeskApiClient(SatisfactionApi as any);
      const { data } = await client.v1SatisfactionIdPut(request.ratingId, {
        rating: request.rating,
        comment: request.comment,
      } as any);
      return data;
    },
    onSuccess: () => {
      // REVIEW: Invalidate satisfaction queries after update
      queryClient.invalidateQueries({ queryKey: ['satisfaction'] });
    },
  });
};
