/**
 * usePrincipalTickets — fetches the paginated ticket list for a principal.
 * Wraps PrincipalTicketsApi.v1PrincipalsPrincipalIdTicketsGet from the generated client.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import {
  PrincipalTicketsApi,
  type HelpdeskDomainTicketsEnumsTicketStatus,
  type HelpdeskDomainTicketsEnumsTicketPriority,
  type HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand,
} from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';

export interface PrincipalTicketFilters {
  status?: HelpdeskDomainTicketsEnumsTicketStatus;
  priority?: HelpdeskDomainTicketsEnumsTicketPriority;
  categoryId?: string;
  assigneeId?: string;
  requesterId?: string;
  searchTerm?: string;
  unreadOnly?: boolean;
}

export function usePrincipalTickets(principalId: string, filters?: PrincipalTicketFilters) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const query = useQuery({
    queryKey: ['principal-tickets', principalId, pagination, filters],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      const response = await client.v1PrincipalsPrincipalIdTicketsGet(
        principalId,
        filters?.status,
        filters?.priority,
        filters?.categoryId,
        filters?.assigneeId,
        filters?.requesterId,
        filters?.searchTerm,
        filters?.unreadOnly,
        pagination.pageIndex + 1,
        pagination.pageSize,
        'createdAt',
        'desc',
      );
      return response.data;
    },
    enabled: Boolean(principalId),
  });

  return {
    ...query,
    items: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    pagination,
    setPagination,
  };
}

export function useCreatePrincipalTicket(principalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (command: HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand) => {
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      const response = await client.v1PrincipalsPrincipalIdTicketsPost(principalId, command);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-tickets', principalId] });
    },
  });
}
