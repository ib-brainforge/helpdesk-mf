import {
  type AddPublicCommentBody,
  addPublicComment,
  retryCommentEmail,
} from '@/api/local/comments';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CommentDto } from '@/types/comment';
import { CommentsApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

/**
 * A public reply. With `sendEmail` it is also emailed to the ticket's contact
 * from the signed-in tech's own mailbox (with their signature), and `cc` adds
 * recipients. Goes through the local client because the generated one has no
 * `sendEmail` or `cc` yet.
 */
export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      ...body
    }: { ticketId: string } & AddPublicCommentBody) =>
      addPublicComment(ticketId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-comments', variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket', variables.ticketId],
      });
    },
  });
};

/** Resends an outbound email that failed. */
export const useRetryCommentEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      commentId,
    }: { ticketId: string; commentId: string }) =>
      retryCommentEmail(ticketId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-comments', variables.ticketId],
      });
    },
  });
};

export const useAddInternalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      body,
      idempotencyKey,
    }: { ticketId: string; body: string; idempotencyKey?: string }) => {
      const client = await createHelpdeskApiClient(CommentsApi);
      const response = await client.v1TicketsTicketIdCommentsInternalNotesPost(
        ticketId,
        { body, idempotencyKey },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-comments', variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket', variables.ticketId],
      });
    },
  });
};
