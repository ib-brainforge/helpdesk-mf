import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { TicketListDto, PagedResult } from '@/types/ticket';
import type { PlatformTicketFilters } from '@/types/admin';
import { toApiTicketStatus, toApiTicketPriority } from '@/utils/typeMappers';

const store = getDefaultStore();

/**
 * Hook for managing platform tickets (for platform.support role)
 */
export const usePlatformTicketsData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [filters, setFilters] = useState<PlatformTicketFilters>({ mine: false });

  const { data, isLoading, refetch } = useQuery<PagedResult<TicketListDto>>({
    queryKey: ['platform-tickets', pagination, filters],
    queryFn: async () => {
      const config = store.get(configAtom);
      const baseUrl = config?.api?.baseUrl ?? '';

      const params = new URLSearchParams();
      if (filters.status?.[0]) {
        params.append('status', toApiTicketStatus(filters.status[0]));
      }
      if (filters.priority?.[0]) {
        params.append('priority', toApiTicketPriority(filters.priority[0]));
      }
      if (filters.categoryId?.[0]) {
        params.append('categoryId', filters.categoryId[0]);
      }
      if (filters.searchTerm) {
        params.append('searchTerm', filters.searchTerm);
      }
      if (filters.mine !== undefined) {
        params.append('mine', String(filters.mine));
      }
      params.append('page', String(pagination.pageIndex + 1));
      params.append('pageSize', String(pagination.pageSize));
      params.append('sortBy', 'CreatedAt');
      params.append('sortDirection', 'desc');

      const response = await authorizedAxios.get(
        `${baseUrl}/v1/platform/tickets?${params.toString()}`
      );

      const result = response.data;
      return {
        items: result.items ?? [],
        totalCount: result.totalCount ?? 0,
        page: result.page ?? 1,
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
      isInternal,
    }: {
      ticketId: string;
      body: string;
      isInternal?: boolean;
    }) => {
      const config = store.get(configAtom);
      const baseUrl = config?.api?.baseUrl ?? '';

      const response = await authorizedAxios.post(
        `${baseUrl}/v1/platform/tickets/${ticketId}/comments`,
        { body, isInternalNote: isInternal ?? false }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tickets'] });
    },
  });
};
