import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { MailServerApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { MailServerConfigDto } from '@/types/email';
import { MailProtocol } from '@/types/email';

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
      // Map backend DTO to frontend types
      return (data || []).map((server: any) => {
        // Convert backend string enum to frontend numeric enum
        const protocol = server.inboundProtocol === 'IMAP'
          ? MailProtocol.Imap
          : MailProtocol.Pop3;

        return {
          id: server.id!,
          name: server.name!,
          protocol,
          inboundHost: server.inboundHost!,
          inboundPort: server.inboundPort ?? 993,
          outboundHost: server.outboundHost!,
          outboundPort: server.outboundPort ?? 587,
          username: server.inboundUsername!,
          useSsl: server.inboundUseSsl ?? true,
          isActive: server.isEnabled ?? true,
          healthStatus: server.isCircuitOpen ? 'Circuit Open' : (server.consecutiveFailures ?? 0) > 0 ? 'Degraded' : 'Healthy',
          folder: server.inboundFolder,
        };
      });
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
