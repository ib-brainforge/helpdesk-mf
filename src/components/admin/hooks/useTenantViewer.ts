import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { TicketListDto, PagedResult } from '@/types/ticket';
import type { TenantTicketFilters } from '@/types/admin';
import { toApiTicketStatus, toApiTicketPriority } from '@/utils/typeMappers';

const store = getDefaultStore();

/**
 * Hook for viewing tickets from a specific tenant (for platform.admin role)
 */
export const useTenantTicketsData = (tenantId: string | null) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [filters, setFilters] = useState<TenantTicketFilters>({});

  const { data, isLoading, refetch } = useQuery<PagedResult<TicketListDto>>({
    queryKey: ['tenant-tickets', tenantId, pagination, filters],
    queryFn: async () => {
      if (!tenantId) {
        return {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: pagination.pageSize,
        };
      }

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
      params.append('page', String(pagination.pageIndex + 1));
      params.append('pageSize', String(pagination.pageSize));
      params.append('sortBy', 'CreatedAt');
      params.append('sortDirection', 'desc');

      const response = await authorizedAxios.get(
        `${baseUrl}/v1/admin/tenants/${tenantId}/tickets?${params.toString()}`
      );

      const result = response.data;
      return {
        items: result.items ?? [],
        totalCount: result.totalCount ?? 0,
        page: result.page ?? 1,
        pageSize: result.pageSize ?? pagination.pageSize,
      };
    },
    enabled: !!tenantId,
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
