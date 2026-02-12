import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { MailServerApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { MailServerConfigDto } from '@/types/email';

export const useMailServersData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, refetch } = useQuery<MailServerConfigDto[]>({
    queryKey: ['mail-servers'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(MailServerApi);
      const { data } = await client.v1MailServersGet();
      // Map generated types to local types
      return (data || []).map((server: any) => ({
        id: server.id!,
        name: server.name!,
        protocol: server.protocol ?? 0,
        inboundHost: server.inboundHost!,
        inboundPort: server.inboundPort ?? 993,
        outboundHost: server.outboundHost!,
        outboundPort: server.outboundPort ?? 587,
        username: server.username!,
        useSsl: server.useSsl ?? true,
        isActive: server.isActive ?? true,
        healthStatus: server.healthStatus,
        folder: server.folder,
      }));
    },
  });

  // Client-side pagination
  const items = data?.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  ) ?? [];

  const totalCount = data?.length ?? 0;

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
