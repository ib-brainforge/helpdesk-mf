import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { AutomationRulesApi } from '@/utils/automationRulesApiStub';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { AutomationRuleListDto } from '@/types/automation';

export const useAutomationRulesData = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, refetch } = useQuery<AutomationRuleListDto[]>({
    queryKey: ['automation-rules', pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AutomationRulesApi);
      const { data } = await client.v1AutomationRulesGet(
        undefined,
        undefined,
        pagination.pageIndex + 1,
        pagination.pageSize
      );
      // API returns PagedResult, extract items
      return ((data as any)?.items || []).map((rule: any) => ({
        id: rule.id!,
        name: rule.name!,
        description: rule.description,
        triggerType: rule.triggerType ?? 0,
        conditionCount: rule.conditionCount ?? 0,
        actionCount: rule.actionCount ?? 0,
        isEnabled: rule.isEnabled ?? false,
        sortOrder: rule.sortOrder ?? 0,
        executionCount: rule.executionCount ?? 0,
        lastExecutedAt: rule.lastExecutedAt,
      }));
    },
  });

  // Server-side pagination handled by API
  const items = data ?? [];
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
