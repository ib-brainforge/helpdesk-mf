/**
 * Platform Self-Service Tickets Hooks
 *
 * Wraps the /v1/platform/my-tickets surface — tickets raised by the current
 * platform staff member on their own behalf (self-service).
 *
 * Used by the navbar widget to display the current user's platform tickets.
 *
 * NOTE: PlatformSelfServiceTicketsApi does not yet exist in the published
 * @brainforgeau/helpdesk-client. These hooks are stubbed for when the backend
 * publishes the /v1/platform/my-tickets route. Use PlatformTicketsApi in the
 * interim if needed.
 * REVIEW: Re-wire once helpdesk-backend publishes /v1/platform/my-tickets endpoints.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

// ─── Ticket list / detail / create ──────────────────────────────────────────

/**
 * Hook for listing the current user's platform self-service tickets.
 * Stubbed pending backend publication of PlatformSelfServiceTicketsApi.
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
    // REVIEW: Replace with real API call once helpdesk-backend publishes /v1/platform/my-tickets
    queryFn: async () => {
      return {
        items: [] as Array<Record<string, unknown>>,
        totalCount: 0,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      };
    },
    enabled: false, // disabled until API is available
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
 * Stubbed pending backend publication of PlatformSelfServiceTicketsApi.
 */
export const usePlatformTicketDetail = (ticketId: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-my-ticket', ticketId],
    // REVIEW: Replace with real API call once helpdesk-backend publishes /v1/platform/my-tickets/{id}
    queryFn: async () => null,
    enabled: false,
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
 * Stubbed pending backend publication of PlatformSelfServiceTicketsApi.
 */
export const useCreatePlatformTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // REVIEW: Replace with real API call once helpdesk-backend publishes /v1/platform/my-tickets
    mutationFn: async (_: { subject: string; description?: string }) => {
      throw new Error('PlatformSelfServiceTicketsApi not yet available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-my-tickets'] });
    },
  });
};
