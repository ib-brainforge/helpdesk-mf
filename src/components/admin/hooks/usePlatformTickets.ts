/**
 * Platform Tickets Hooks - MIGRATED to Generated Client
 *
 * Phase 2: Frontend Unification
 * Updated to use @brainforgeau/helpdesk-client generated API instead of raw axios
 *
 * DEPRECATED: Use useUnifiedTicketsData with source='platform' instead
 * These hooks are kept for backward compatibility during migration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { PlatformTicketsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { PlatformTicketListItem, PlatformTicketDetail, PlatformTicketFilters, PagedResult } from '@/types/admin';

/**
 * Hook for managing platform tickets (for platform.support role)
 * @deprecated Use useUnifiedTicketsData({ source: 'platform' }) instead
 */
export const usePlatformTicketsData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [filters, setFilters] = useState<PlatformTicketFilters>({ mine: false });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platform-tickets', pagination.pageIndex, pagination.pageSize, filters],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PlatformTicketsApi);

      const response = await client.v1PlatformTicketsGet(
        filters.status as any,
        filters.priority as any,
        filters.categoryId,
        filters.mine,
        filters.searchTerm,
        pagination.pageIndex + 1,
        pagination.pageSize,
        'createdAt',
        'desc'
      );

      // Normalize response from generated client
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
    filters,
    setFilters,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};

/**
 * Hook for assigning a platform ticket
 */
export const useAssignPlatformTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, assigneeId }: { ticketId: string; assigneeId: string }) => {
      const client = await createHelpdeskApiClient(PlatformTicketsApi);
      const response = await client.v1PlatformTicketsIdAssignPatch(ticketId, { assigneeId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tickets'] });
    },
  });
};

/**
 * Hook for updating platform ticket status
 */
export const useUpdatePlatformTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const client = await createHelpdeskApiClient(PlatformTicketsApi);
      const response = await client.v1PlatformTicketsIdStatusPatch(ticketId, { status: status as any });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tickets'] });
    },
  });
};

/**
 * Hook for adding comment to platform ticket
 */
export const useAddPlatformTicketComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      body,
      isInternalNote,
    }: {
      ticketId: string;
      body: string;
      isInternalNote?: boolean;
    }) => {
      const client = await createHelpdeskApiClient(PlatformTicketsApi);
      const response = await client.v1PlatformTicketsIdCommentsPost(ticketId, {
        body,
        isInternalNote: isInternalNote ?? false,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['platform-ticket', variables.ticketId] });
    },
  });
};

/**
 * Hook for fetching a single platform ticket with comments
 */
export const usePlatformTicketDetail = (ticketId: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-ticket', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PlatformTicketsApi);
      const response = await client.v1PlatformTicketsIdGet(ticketId);
      // Generated client returns the DTO directly
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
