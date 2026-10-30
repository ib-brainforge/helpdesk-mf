import type { CommentEmailStatus } from '@/api/local/comments';
import type { CommentDto } from '@/types/comment';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSignalR } from './useSignalR';

/**
 * Real-time event DTOs matching backend interface IHelpdeskClient
 * These match the event DTOs from Helpdesk.Application/RealTime/Events/
 */
interface CommentAddedEventDto {
  commentId: string;
  ticketId: string;
  tenantId: string;
  body: string;
  authorId: string | null;
  isInternal: boolean;
  createdAt: string;
}

/** A public reply's email changed state (sent, or failed). */
interface CommentEmailStatusChangedEventDto {
  commentId: string;
  ticketId: string;
  status: CommentEmailStatus;
  statusReason: string | null;
  statusAt: string;
}

interface CommentUpdatedEventDto {
  commentId: string;
  ticketId: string;
  tenantId: string;
  body: string;
  updatedAt: string;
}

/**
 * Hook to listen for real-time comment updates on a specific ticket.
 * Automatically invalidates TanStack Query caches when comment events arrive.
 *
 * @param ticketId - The ticket ID to subscribe to for comment updates
 *
 * @example
 * // In TicketDetail component
 * useRealtimeComments(ticketId);
 */
export const useRealtimeComments = (ticketId: string) => {
  const queryClient = useQueryClient();

  const { connection, isConnected } = useSignalR({
    hubPath: '/hubs/helpdesk',
    autoConnect: true,
  });

  useEffect(() => {
    if (!connection || !isConnected || !ticketId) {
      return;
    }

    // REVIEW: Subscribe to this specific ticket's updates
    // Backend HelpdeskHub.SubscribeTicket adds connection to group
    connection
      .invoke('SubscribeTicket', ticketId)
      .then(() => {
        console.debug('[useRealtimeComments] Subscribed to ticket:', ticketId);
      })
      .catch(err => {
        console.error(
          '[useRealtimeComments] Failed to subscribe to ticket:',
          err,
        );
      });

    // Event handlers for comment events
    const handleCommentAdded = (event: CommentAddedEventDto) => {
      console.debug(
        '[useRealtimeComments] CommentAdded:',
        event.commentId,
        'on ticket:',
        event.ticketId,
      );

      // REVIEW: Only invalidate if this comment is for the current ticket
      if (event.ticketId === ticketId) {
        // Invalidate comments query to fetch the new comment
        queryClient.invalidateQueries({
          queryKey: ['helpdesk-comments', ticketId],
        });
        // Invalidate ticket detail (may have unread count, last activity, etc.)
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      }
    };

    const handleCommentUpdated = (event: CommentUpdatedEventDto) => {
      console.debug(
        '[useRealtimeComments] CommentUpdated:',
        event.commentId,
        'on ticket:',
        event.ticketId,
      );

      // REVIEW: Only invalidate if this comment is for the current ticket
      if (event.ticketId === ticketId) {
        queryClient.invalidateQueries({
          queryKey: ['helpdesk-comments', ticketId],
        });
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      }
    };

    /*
     * Patched in place rather than refetched: only the one comment's email
     * status moved, and the event already carries it.
     */
    const handleEmailStatusChanged = (
      event: CommentEmailStatusChangedEventDto,
    ) => {
      if (event.ticketId !== ticketId) return;
      queryClient.setQueryData<CommentDto[]>(
        ['helpdesk-comments', ticketId],
        comments =>
          comments?.map(c =>
            c.id === event.commentId && c.email
              ? {
                  ...c,
                  email: {
                    ...c.email,
                    status: event.status,
                    statusReason: event.statusReason,
                    statusAt: event.statusAt,
                  },
                }
              : c,
          ),
      );
    };

    // Register event handlers
    connection.on('CommentAdded', handleCommentAdded);
    connection.on('CommentUpdated', handleCommentUpdated);
    connection.on('CommentEmailStatusChanged', handleEmailStatusChanged);

    // Cleanup: Unsubscribe and remove handlers
    return () => {
      connection.off('CommentAdded', handleCommentAdded);
      connection.off('CommentUpdated', handleCommentUpdated);
      connection.off('CommentEmailStatusChanged', handleEmailStatusChanged);

      // Unsubscribe from ticket
      connection.invoke('UnsubscribeTicket', ticketId).catch(err => {
        console.error(
          '[useRealtimeComments] Failed to unsubscribe from ticket:',
          err,
        );
      });
    };
  }, [connection, isConnected, ticketId, queryClient]);

  return { isConnected };
};
