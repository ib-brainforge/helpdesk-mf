import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { UsersApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { HelpdeskUserDto, HelpdeskUserRole } from '@/types/user';

interface UsersFilters {
  role?: HelpdeskUserRole;
  includeDisabled?: boolean;
}

export const useUsersData = (filters?: UsersFilters) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data: pagedData, isLoading, refetch } = useQuery({
    queryKey: ['helpdesk-users', pagination.pageIndex + 1, pagination.pageSize, filters?.role, filters?.includeDisabled],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(UsersApi);
      const { data } = await client.v1UsersGet(
        filters?.role as any, // REVIEW: Type mapping between HelpdeskUserRole and backend enum
        filters?.includeDisabled ?? false, // includeDisabled
        pagination.pageIndex + 1,
        pagination.pageSize
      );
      // REVIEW: Using server-side pagination instead of client-side
      return data;
    },
  });

  // REVIEW: Changed from client-side to server-side pagination
  const items = (pagedData?.items as unknown as HelpdeskUserDto[]) ?? [];
  const totalCount = pagedData?.totalCount ?? 0;

  return {
    items,
    totalCount,
    pagination,
    setPagination,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};
