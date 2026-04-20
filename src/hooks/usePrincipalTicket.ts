/**
 * usePrincipalTicket — fetches a single ticket detail in a principal's console.
 *
 * The published @brainforgeau/helpdesk-client does not yet export PrincipalTicketsApi.
 * We use TicketsApi as the class token and cast to `any` to call the principal-scoped
 * methods at runtime. The backend routes /v1/principals/{principalId}/tickets/* exist.
 *
 * REVIEW: Remove casts once helpdesk-backend republishes with PrincipalTicketsApi exported.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TicketsApi,
  type HelpdeskApplicationTicketsCommandsChangeTicketStatusChangeTicketStatusCommand,
  type HelpdeskApplicationTicketsCommandsChangeTicketPriorityChangeTicketPriorityCommand,
  type HelpdeskApplicationTicketsCommandsAssignTicketAssignTicketCommand,
} from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';

export function usePrincipalTicket(principalId: string, ticketId: string) {
  return useQuery({
    queryKey: ['principal-ticket', principalId, ticketId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1PrincipalsPrincipalIdTicketsIdGet(principalId, ticketId);
      return response.data;
    },
    enabled: Boolean(principalId) && Boolean(ticketId),
  });
}

export function useUpdatePrincipalTicketStatus(principalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      command,
    }: {
      ticketId: string;
      command: HelpdeskApplicationTicketsCommandsChangeTicketStatusChangeTicketStatusCommand;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(TicketsApi);
      await client.v1PrincipalsPrincipalIdTicketsIdStatusPatch(principalId, ticketId, command);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['principal-ticket', principalId, variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['principal-tickets', principalId] });
    },
  });
}

export function useUpdatePrincipalTicketPriority(principalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      command,
    }: {
      ticketId: string;
      command: HelpdeskApplicationTicketsCommandsChangeTicketPriorityChangeTicketPriorityCommand;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(TicketsApi);
      await client.v1PrincipalsPrincipalIdTicketsIdPriorityPatch(principalId, ticketId, command);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['principal-ticket', principalId, variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['principal-tickets', principalId] });
    },
  });
}

export function useAssignPrincipalTicket(principalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      command,
    }: {
      ticketId: string;
      command: HelpdeskApplicationTicketsCommandsAssignTicketAssignTicketCommand;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(TicketsApi);
      await client.v1PrincipalsPrincipalIdTicketsIdAssignPatch(principalId, ticketId, command);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['principal-ticket', principalId, variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['principal-tickets', principalId] });
    },
  });
}
