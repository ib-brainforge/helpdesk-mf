import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand,
  type HelpdeskDomainTicketsEnumsTicketPriority,
  type HelpdeskDomainTicketsEnumsTicketStatus,
  PrincipalTicketsApi,
} from '@brainforgeau/helpdesk-client';
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

/** Builds the axios options for the params the generated client does not know. */
const scopeParams = (filters?: PrincipalTicketFilters) => {
  const params: Record<string, unknown> = {};
  if (filters?.tenantId) params.tenantId = filters.tenantId;
  if (filters?.organisationId) params.organisationId = filters.organisationId;
  if (filters?.divisionId) params.divisionId = filters.divisionId;
  if (filters?.tagIds?.length) params.tagIds = filters.tagIds;
  return Object.keys(params).length > 0
    ? { params, paramsSerializer: { indexes: null as null } }
    : undefined;
};

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
        undefined, // customStatusId — not surfaced in the principal tickets view
        filters?.priority,
        filters?.categoryId,
        filters?.assigneeId,
        filters?.requesterId,
        filters?.searchTerm,
        filters?.unreadOnly,
        undefined, // overdueOnly — not surfaced in the principal tickets view
        undefined, // unassignedOnly — not used for principal tickets view
        pagination.pageIndex + 1,
        pagination.pageSize,
        'createdAt',
        'desc',
        /*
         * Scope and tag filters, sent through the raw axios config rather than
         * as named arguments. The backend accepts tenantId, organisationId,
         * divisionId and tagIds (see GetTicketsQuery), but
         * @brainforgeau/helpdesk-client is generated from the OpenAPI spec by
         * CI, so the generated signature will not carry them until
         * generate-client.yml runs against the merged backend change.
         *
         * `indexes: null` makes axios emit `tagIds=a&tagIds=b` rather than its
         * default `tagIds[]=a`, which is the form ASP.NET Core model binding
         * expects for a Guid[] query parameter.
         *
         * REPLACE WITH the generated named arguments once the client is
         * regenerated, and drop this options object.
         */
        scopeParams(filters),
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
