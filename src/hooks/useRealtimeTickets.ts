import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSignalR } from './useSignalR';

/**
 * Real-time event DTOs matching backend interface IHelpdeskClient
 * These match the event DTOs from Helpdesk.Application/RealTime/Events/
 */
interface TicketCreatedEventDto {
  ticketId: string;
  tenantId: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  origin: string;
  requesterId: string | null;
  assignedToId: string | null;
  categoryId: string | null;
  createdAt: string;
}

interface TicketUpdatedEventDto {
  ticketId: string;
  tenantId: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  assignedToId: string | null;
  categoryId: string | null;
  dueDate: string | null;
  updatedAt: string;
}

interface TicketDeletedEventDto {
  ticketId: string;
  tenantId: string;
  deletedByUserId: string | null;
  deletedAt: string;
}

interface TicketStatusChangedEventDto {
  ticketId: string;
  tenantId: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  changedByUserId: string | null;
}

interface TicketAssignedEventDto {
  ticketId: string;
  tenantId: string;
  assignedToId: string | null;
  assignedByUserId: string | null;
  assignedAt: string;
}

/**
 * Hook to listen for real-time ticket updates via SignalR.
 * Automatically invalidates TanStack Query caches when events arrive.
 *
 * @example
 * // In TicketGrid component
 * useRealtimeTickets();
 */
export const useRealtimeTickets = () => {
  const queryClient = useQueryClient();

  const { connection, isConnected } = useSignalR({
    hubPath: '/hubs/helpdesk',
    autoConnect: true,
  });

  useEffect(() => {
    if (!connection || !isConnected) {
      return;
    }

    // REVIEW: Listening to all ticket events defined in IHelpdeskClient
    // When events arrive, invalidate relevant query caches

    const handleTicketCreated = (event: TicketCreatedEventDto) => {
      console.debug('[useRealtimeTickets] TicketCreated:', event.ticketId);
      // Invalidate the tickets list to show the new ticket
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    };

    const handleTicketUpdated = (event: TicketUpdatedEventDto) => {
      console.debug('[useRealtimeTickets] TicketUpdated:', event.ticketId);
      // Invalidate both the list and the specific ticket detail
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', event.ticketId] });
    };

    const handleTicketDeleted = (event: TicketDeletedEventDto) => {
      console.debug('[useRealtimeTickets] TicketDeleted:', event.ticketId);
      // Invalidate the list to remove the deleted ticket
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', event.ticketId] });
    };

    const handleTicketStatusChanged = (event: TicketStatusChangedEventDto) => {
      console.debug('[useRealtimeTickets] TicketStatusChanged:', event.ticketId);
      // Invalidate both the list (status may affect filtering/sorting) and detail
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', event.ticketId] });
    };

    const handleTicketAssigned = (event: TicketAssignedEventDto) => {
      console.debug('[useRealtimeTickets] TicketAssigned:', event.ticketId);
      // Invalidate both the list (assignment may affect filtering) and detail
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', event.ticketId] });
    };

    // Register event handlers
    connection.on('TicketCreated', handleTicketCreated);
    connection.on('TicketUpdated', handleTicketUpdated);
    connection.on('TicketDeleted', handleTicketDeleted);
    connection.on('TicketStatusChanged', handleTicketStatusChanged);
    connection.on('TicketAssigned', handleTicketAssigned);

    // Cleanup: Remove event handlers when component unmounts
    return () => {
      connection.off('TicketCreated', handleTicketCreated);
      connection.off('TicketUpdated', handleTicketUpdated);
      connection.off('TicketDeleted', handleTicketDeleted);
      connection.off('TicketStatusChanged', handleTicketStatusChanged);
      connection.off('TicketAssigned', handleTicketAssigned);
    };
  }, [connection, isConnected, queryClient]);

  return { isConnected };
};
