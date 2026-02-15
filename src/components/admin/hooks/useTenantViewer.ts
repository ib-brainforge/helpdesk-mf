import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { TenantTicketFilters } from '@/types/admin';
import type { TicketListDto, PagedResult } from '@/types/ticket';

const store = getDefaultStore();

/**
 * Hook for viewing tickets from a specific tenant (for platform.admin role)
 */
export const useTenantTicketsData = (tenantId: string | null) => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [filters, setFilters] = useState<TenantTicketFilters>({});

  const { data, isLoading, refetch } = useQuery<PagedResult<TicketListDto>>({
    queryKey: ['tenant-tickets', tenantId, page, pageSize, filters],
    queryFn: async () => {
      if (!tenantId) {
        return {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize,
        } as PagedResult<TicketListDto>;
      }

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
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      params.append('sortBy', 'CreatedAt');
      params.append('sortDirection', 'desc');

      const response = await authorizedAxios.get(
        `${baseUrl}/v1/admin/tenants/${tenantId}/tickets?${params.toString()}`
      );

      return response.data;
    },
    enabled: !!tenantId,
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
