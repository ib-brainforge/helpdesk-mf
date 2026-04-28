import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { AppSettingsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { EmailTemplateDto } from '@/types/email-template';

// REVIEW: Email templates are stored in AppSettings with category 'EmailTemplate'
export const useEmailTemplatesData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, refetch } = useQuery<EmailTemplateDto[]>({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AppSettingsApi);
      const { data } = await client.v1AppSettingsGet(true, 'EmailTemplate');
      // Map AppSettings to EmailTemplateDto structure
      return (data || []).map((setting: any) => {
        // Parse the JSON value which contains the template data
        const templateData = typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value;

        return {
          id: setting.id!,
          name: setting.key || templateData.name || '',
          notificationType: templateData.notificationType ?? 0,
          subject: templateData.subject || '',
          body: templateData.body || '',
          isActive: setting.isActive ?? true,
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
