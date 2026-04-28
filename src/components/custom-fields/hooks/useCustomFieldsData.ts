import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { CustomFieldsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CustomFieldDefinitionDto } from '@/types/custom-field';

export const useCustomFieldsData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, refetch } = useQuery<CustomFieldDefinitionDto[]>({
    queryKey: ['helpdesk-custom-fields'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CustomFieldsApi);
      const { data } = await client.v1CustomFieldsGet();
      // Map generated types to local types
      return (data || []).map((field: any) => ({
        id: field.id!,
        name: field.name!,
        fieldType: field.fieldType ?? 0,
        usageType: field.usageType ?? 0,
        isRequired: field.isRequired ?? false,
        accessLevel: field.accessLevel ?? 0,
        isActive: field.isActive ?? true,
        options: field.options?.map((opt: any) => ({
          id: opt.id!,
          value: opt.value!,
          sortOrder: opt.sortOrder ?? 0,
        })),
      }));
    },
  });

  // Client-side pagination
  const items = data?.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
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
