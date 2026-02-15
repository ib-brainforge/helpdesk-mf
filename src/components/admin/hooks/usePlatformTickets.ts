import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { PlatformTicketListItem, PlatformTicketFilters, PagedResult } from '@/types/admin';

const store = getDefaultStore();

/**
 * Hook for managing platform tickets (for platform.support role)
 */
export const usePlatformTicketsData = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [filters, setFilters] = useState<PlatformTicketFilters>({ mine: false });

  const { data, isLoading, refetch } = useQuery<PagedResult<PlatformTicketListItem>>({
    queryKey: ['platform-tickets', page, pageSize, filters],
    queryFn: async () => {
      const config = store.get(configAtom);
      const baseUrl = config?.api?.baseUrl ?? '';

      const params = new URLSearchParams();
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.priority) {
        params.append('priority', filters.priority);
      }
      if (filters.categoryId) {
        params.append('categoryId', filters.categoryId);
      }
      if (filters.searchTerm) {
        params.append('searchTerm', filters.searchTerm);
      }
      if (filters.mine !== undefined) {
        params.append('mine', String(filters.mine));
      }
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      params.append('sortBy', 'CreatedAt');
      params.append('sortDirection', 'desc');

      const response = await authorizedAxios.get(
        `${baseUrl}/v1/platform/tickets?${params.toString()}`
      );

      return response.data;
    },
  });

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    page,
    setPage,
    pageSize,
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
      const config = store.get(configAtom);
      const baseUrl = config?.api?.baseUrl ?? '';

      const response = await authorizedAxios.put(
        `${baseUrl}/v1/platform/tickets/${ticketId}/assign`,
        { assigneeId }
      );
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
      const config = store.get(configAtom);
      const baseUrl = config?.api?.baseUrl ?? '';

      const response = await authorizedAxios.put(
        `${baseUrl}/v1/platform/tickets/${ticketId}/status`,
        { status }
      );
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
      const config = store.get(configAtom);
      const baseUrl = config?.api?.baseUrl ?? '';

      const response = await authorizedAxios.post(
        `${baseUrl}/v1/platform/tickets/${ticketId}/comments`,
        { body, isInternalNote: isInternalNote ?? false }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tickets'] });
    },
  });
};
