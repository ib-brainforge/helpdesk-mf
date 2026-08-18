import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CustomFieldDefinitionDto } from '@/types/custom-field';
import { CustomFieldsApi } from '@brainforgeau/helpdesk-client';
import { useQuery } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

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
        meta: field.meta,
      }));
    },
  });

  // Client-side pagination
  const items =
    data?.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize,
    ) ?? [];

  const totalCount = data?.length ?? 0;

  return {
    items,
    /**
     * The full, unpaginated set -- needed by `useScopeList` (DTO tenancy/
     * scope metadata initiative), whose out-of-context counting and
     * "Change all N" bulk editor must consider every loaded record, not
     * just the current client-side-paginated page.
     */
    allItems: data ?? [],
    totalCount,
    pagination,
    setPagination,
    isLoading,
    refetch: useCallback(() => {
      refetch();
    }, [refetch]),
  };
};
