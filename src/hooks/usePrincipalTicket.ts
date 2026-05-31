import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationTicketsCommandsAssignTicketAssignTicketCommand,
  type HelpdeskApplicationTicketsCommandsChangeTicketPriorityChangeTicketPriorityCommand,
  type HelpdeskApplicationTicketsCommandsChangeTicketStatusChangeTicketStatusCommand,
  PrincipalTicketsApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function usePrincipalTicket(principalId: string, ticketId: string) {
  return useQuery({
    queryKey: ['principal-ticket', principalId, ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      const response = await client.v1PrincipalsPrincipalIdTicketsIdGet(
        principalId,
        ticketId,
      );
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
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      await client.v1PrincipalsPrincipalIdTicketsIdStatusPatch(
        principalId,
        ticketId,
        command,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['principal-ticket', principalId, variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['principal-tickets', principalId],
      });
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
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      await client.v1PrincipalsPrincipalIdTicketsIdPriorityPatch(
        principalId,
        ticketId,
        command,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['principal-ticket', principalId, variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['principal-tickets', principalId],
      });
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
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      await client.v1PrincipalsPrincipalIdTicketsIdAssignPatch(
        principalId,
        ticketId,
        command,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['principal-ticket', principalId, variables.ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['principal-tickets', principalId],
      });
    },
  });
}
