import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CommentsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CommentDto } from '@/types/comment';

export const useComments = (ticketId: string) => {
  const { data, isLoading, refetch } = useQuery<CommentDto[]>({
    queryKey: ['helpdesk-comments', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CommentsApi);
      const response = await client.v1TicketsTicketIdCommentsGet(ticketId);
      return (response.data.items ?? []) as CommentDto[];
    },
    enabled: Boolean(ticketId),
  });

  return {
    comments: data ?? [],
    isLoading,
    refetch,
  };
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      const client = await createHelpdeskApiClient(CommentsApi);
      const response = await client.v1TicketsTicketIdCommentsPost(ticketId, {
        body,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-comments', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
    },
  });
};

export const useAddInternalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      const client = await createHelpdeskApiClient(CommentsApi);
      const response = await client.v1TicketsTicketIdCommentsInternalNotesPost(ticketId, {
        body,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-comments', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
    },
  });
};
