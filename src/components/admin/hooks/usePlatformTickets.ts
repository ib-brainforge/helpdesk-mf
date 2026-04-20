/**
 * Platform Self-Service Tickets Hooks
 *
 * Wraps the /v1/platform/my-tickets surface — tickets raised by the current
 * platform staff member on their own behalf (self-service).
 *
 * Used by the navbar widget to display the current user's platform tickets.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { PlatformSelfServiceTicketsApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

// ─── Comments ────────────────────────────────────────────────────────────────

/**
 * Fetches paginated comments for a platform self-service ticket.
 * Maps to GET /v1/platform/my-tickets/{id}/comments.
 */
export const usePlatformTicketComments = (
  ticketId: string,
  page = 1,
  pageSize = 50,
) => {
  return useQuery({
    queryKey: ['platform-my-ticket-comments', ticketId, page, pageSize],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(
        PlatformSelfServiceTicketsApi,
      );
      const response = await client.v1PlatformMyTicketsIdCommentsGet(
        ticketId,
        page,
        pageSize,
      );
      return response.data;
    },
    enabled: Boolean(ticketId),
  });
};

/**
 * Adds a comment to a platform self-service ticket.
 * Maps to POST /v1/platform/my-tickets/{id}/comments.
 */
export const useAddPlatformTicketComment = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const client = await createHelpdeskApiClient(
        PlatformSelfServiceTicketsApi,
      );
      const response = await client.v1PlatformMyTicketsIdCommentsPost(
        ticketId,
        { body },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['platform-my-ticket-comments', ticketId],
      });
    },
  });
};

// ─── Ticket list / detail / create ──────────────────────────────────────────

/**
 * Hook for listing the current user's platform self-service tickets.
 * Maps to GET /v1/platform/my-tickets.
 */
export const usePlatformTicketsData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'platform-my-tickets',
      pagination.pageIndex,
      pagination.pageSize,
      searchTerm,
    ],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(
        PlatformSelfServiceTicketsApi,
      );

      const response = await client.v1PlatformMyTicketsGet(
        undefined, // status
        undefined, // priority
        undefined, // categoryId
        searchTerm,
        pagination.pageIndex + 1,
        pagination.pageSize,
        'createdAt',
        'desc',
      );

      const result = response.data;
      return {
        items: result.items ?? [],
        totalCount: result.totalCount ?? 0,
        page: result.page ?? pagination.pageIndex + 1,
        pageSize: result.pageSize ?? pagination.pageSize,
      };
    },
  });

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    pagination,
    setPagination,
    searchTerm,
    setSearchTerm,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};

/**
 * Hook for fetching a single platform self-service ticket.
 * Maps to GET /v1/platform/my-tickets/{id}.
 */
export const usePlatformTicketDetail = (ticketId: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-my-ticket', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(
        PlatformSelfServiceTicketsApi,
      );
      const response = await client.v1PlatformMyTicketsIdGet(ticketId);
      return response.data;
    },
    enabled: Boolean(ticketId),
  });

  return {
    data: data ?? null,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook for creating a platform self-service ticket.
 * Maps to POST /v1/platform/my-tickets.
 */
export const useCreatePlatformTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subject,
      description,
    }: { subject: string; description?: string }) => {
      const client = await createHelpdeskApiClient(
        PlatformSelfServiceTicketsApi,
      );
      const response = await client.v1PlatformMyTicketsPost({
        subject,
        description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-my-tickets'] });
    },
  });
};
