import {
  type HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand,
  type HelpdeskDomainTicketsEnumsTicketPriority,
  type HelpdeskDomainTicketsEnumsTicketStatus,
  PrincipalTicketsApi,
} from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useState } from 'react';

export interface PrincipalTicketFilters {
  status?: HelpdeskDomainTicketsEnumsTicketStatus;
  priority?: HelpdeskDomainTicketsEnumsTicketPriority;
  categoryId?: string;
  assigneeId?: string;
  requesterId?: string;
  searchTerm?: string;
  unreadOnly?: boolean;
  /** ANY-of tag filter. */
  tagIds?: string[];
  /** Scope narrowing inside the principal's own access. */
  tenantId?: string;
  organisationId?: string;
  divisionId?: string;
}

export function usePrincipalTickets(
  principalId: string,
  filters?: PrincipalTicketFilters,
) {
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
        undefined, // statuses
        undefined, // customStatusId — not surfaced in the principal tickets view
        filters?.priority,
        filters?.categoryId,
        filters?.assigneeId,
        filters?.requesterId,
        filters?.searchTerm,
        filters?.unreadOnly,
        undefined, // overdueOnly — not surfaced in the principal tickets view
        undefined, // unassignedOnly — not used for principal tickets view
        filters?.tenantId || undefined,
        filters?.organisationId || undefined,
        filters?.divisionId || undefined,
        filters?.tagIds?.length ? filters.tagIds : undefined,
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
    mutationFn: async (
      command: HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand,
    ) => {
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      const response = await client.v1PrincipalsPrincipalIdTicketsPost(
        principalId,
        command,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['principal-tickets', principalId],
      });
    },
  });
}
