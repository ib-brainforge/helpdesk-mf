/**
 * usePrincipalTickets — fetches the paginated ticket list for a principal.
 *
 * The published @brainforgeau/helpdesk-client does not yet export PrincipalTicketsApi.
 * We use TicketsApi as the class token and cast to `any` to call the principal-scoped
 * methods at runtime.
 *
 * REVIEW: Remove casts once helpdesk-backend republishes with PrincipalTicketsApi exported.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import {
  TicketsApi,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(TicketsApi);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(TicketsApi);
      const response = await client.v1PrincipalsPrincipalIdTicketsPost(principalId, command);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-tickets', principalId] });
    },
  });
}
