/**
 * Unified data hook for tickets across all sources (regular, platform, tenant)
 *
 * Phase 2: Frontend Unification
 * Provides a single interface for fetching and managing tickets regardless of source
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { TicketsApi, PlatformTicketsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { UnifiedTicketListItem, TicketSource } from '@/types/unified-ticket';

const store = getDefaultStore();

export interface UnifiedTicketFilters {
  status?: string;
  priority?: string;
  categoryId?: string;
  assigneeId?: string;
  requesterId?: string;
  searchTerm?: string;
  mine?: boolean; // Platform-only filter
  unreadOnly?: boolean; // Regular-only filter
}

interface UseUnifiedTicketsOptions {
  source: TicketSource;
  tenantId?: string; // Required for 'tenant' source
  filters?: UnifiedTicketFilters;
}

/**
 * Unified hook for fetching tickets from any source
 *
 * @param options - Configuration object
 * @returns Normalized ticket data and pagination controls
 */
export function useUnifiedTicketsData(options: UseUnifiedTicketsOptions) {
  const { source, tenantId } = options;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const [filters, setFilters] = useState<UnifiedTicketFilters>(options.filters ?? {});

  // Query based on source
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['unified-tickets', source, tenantId, pagination, filters],
    queryFn: async () => {
      if (source === 'regular') {
        return fetchRegularTickets(pagination, filters);
      } else if (source === 'platform') {
        return fetchPlatformTickets(pagination, filters);
      } else if (source === 'tenant') {
        if (!tenantId) {
          throw new Error('tenantId is required for tenant source');
        }
        return fetchTenantTickets(tenantId, pagination, filters);
      }

      return { items: [], totalCount: 0 };
    },
    enabled: source !== 'tenant' || !!tenantId,
  });

  const items: UnifiedTicketListItem[] = useMemo(
    () => data?.items ?? [],
    [data?.items]
  );

  return {
    items,
    totalCount: data?.totalCount ?? 0,
    pagination,
    setPagination,
    filters,
    setFilters,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Fetch tickets from regular tickets API
 */
async function fetchRegularTickets(
  pagination: PaginationState,
  filters: UnifiedTicketFilters
): Promise<{ items: UnifiedTicketListItem[]; totalCount: number }> {
  const client = await createHelpdeskApiClient(TicketsApi);

  const response = await client.v1TicketsGet(
    filters.status as any,
    filters.priority as any,
    filters.categoryId,
    filters.assigneeId,
    filters.requesterId,
    filters.searchTerm,
    filters.unreadOnly,
    pagination.pageIndex + 1,
    pagination.pageSize,
    'createdAt',
    'desc'
  );

  const result = response.data;

  // Normalize to UnifiedTicketListItem
  const items: UnifiedTicketListItem[] = (result.items ?? []).map((ticket) => ({
    ...ticket,
    // Regular tickets already have aligned field names (requesterId, modifiedAt, etc.)
  }));

  return {
    items,
    totalCount: result.totalCount ?? 0,
  };
}

/**
 * Fetch tickets from platform tickets API
 */
async function fetchPlatformTickets(
  pagination: PaginationState,
  filters: UnifiedTicketFilters
): Promise<{ items: UnifiedTicketListItem[]; totalCount: number }> {
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

  const result = response.data;

  // Normalize to UnifiedTicketListItem
  const items: UnifiedTicketListItem[] = (result.items ?? []).map((ticket) => ({
    ...ticket,
    // Platform tickets already have aligned field names (requesterId, modifiedAt, etc.)
    // Platform-specific fields (submitterEmail, submitterTenantId, etc.) are preserved
  }));

  return {
    items,
    totalCount: result.totalCount ?? 0,
  };
}

/**
 * Fetch tickets from tenant viewer API (admin only)
 * This endpoint allows admins to view tickets for a specific tenant
 */
async function fetchTenantTickets(
  tenantId: string,
  pagination: PaginationState,
  filters: UnifiedTicketFilters
): Promise<{ items: UnifiedTicketListItem[]; totalCount: number }> {
  const config = store.get(configAtom);
  const baseUrl = config?.api?.baseUrl ?? '';

  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
  params.append('page', String(pagination.pageIndex + 1));
  params.append('pageSize', String(pagination.pageSize));

  const response = await authorizedAxios.get(
    `${baseUrl}/v1/admin/tenants/${tenantId}/tickets?${params.toString()}`
  );

  // Normalize to UnifiedTicketListItem
  const result = response.data;
  const items: UnifiedTicketListItem[] = (result.items ?? []).map((ticket: any) => ({
    ...ticket,
    // Tenant viewer returns regular ticket format
  }));

  return {
    items,
    totalCount: result.totalCount ?? 0,
  };
}
